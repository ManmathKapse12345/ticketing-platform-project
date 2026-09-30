// backend/src/services/refund.service.js
const getRazorpay = require("../config/razorpay.js");
const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

// Marks the refund APPROVED. Once approved refunds cover the whole payment,
// the order is refunded: tickets cancelled and seats handed back to the tiers.
// Idempotent: the API response and the refund.processed webhook both land here.
const completeRefund = (refundId) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.refund.updateMany({
      where: { id: refundId, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    if (count === 0) return;

    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    // Lock the payment row so two refunds completing at once can't both miss
    // that together they cover the full amount.
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${refund.paymentId}::uuid FOR UPDATE`;
    const payment = await tx.payment.findUnique({ where: { id: refund.paymentId } });

    const { _sum } = await tx.refund.aggregate({
      where: { paymentId: payment.id, status: "APPROVED" },
      _sum: { amountMinor: true },
    });
    // Partial refund: money back only, tickets stay valid.
    if (_sum.amountMinor < payment.amountMinor) return;

    await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });

    const { count: orderCount } = await tx.order.updateMany({
      where: { id: payment.orderId, paymentStatus: "PAID" },
      data: { paymentStatus: "REFUNDED" },
    });
    if (orderCount === 0) return;

    await tx.ticket.updateMany({
      where: { orderId: payment.orderId, status: "active" },
      data: { status: "cancelled" },
    });

    const items = await tx.orderItem.findMany({ where: { orderId: payment.orderId } });
    for (const item of items) {
      await tx.ticketTier.update({
        where: { id: item.ticketTierId },
        data: { quantitySold: { decrement: item.quantity } },
      });
    }
  });

// Marks the refund REJECTED and releases its reserved amount so it can be retried.
const failRefund = (refundId) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.refund.updateMany({
      where: { id: refundId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    if (count === 0) return;

    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    await tx.payment.update({
      where: { id: refund.paymentId },
      data: { refundedMinor: { decrement: refund.amountMinor } },
    });
  });

const createRefund = async (organizationId, orderId, amountMinor, reason) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, organizationId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentStatus !== "PAID") {
    throw new ApiError(409, `Order is ${order.paymentStatus.toLowerCase()}, nothing to refund`);
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, status: "SUCCESS" },
  });
  if (!payment) throw new ApiError(404, "No successful payment found for this order");
  if (!payment.gatewayPaymentId) {
    throw new ApiError(409, "Payment has no gateway payment id to refund against");
  }

  const refundAmount = amountMinor ?? payment.amountMinor - payment.refundedMinor;
  if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
    throw new ApiError(400, "Invalid refund amount");
  }

  // Atomic reservation: Postgres re-checks the WHERE under the row lock, so
  // concurrent refunds can never add up to more than was paid.
  const reserved = await prisma.$executeRaw`
    UPDATE "Payment"
    SET "refundedMinor" = "refundedMinor" + ${refundAmount}, "updatedAt" = NOW()
    WHERE id = ${payment.id}::uuid
      AND status = 'SUCCESS'
      AND "refundedMinor" + ${refundAmount} <= "amountMinor"`;
  if (reserved === 0) {
    throw new ApiError(409, "Refund exceeds the amount left to refund");
  }

  const refund = await prisma.refund.create({
    data: { organizationId, paymentId: payment.id, amountMinor: refundAmount, reason },
  });

  let gatewayRefund;
  try {
    gatewayRefund = await getRazorpay().payments.refund(payment.gatewayPaymentId, {
      amount: refundAmount,
      notes: { orderId: order.id, refundId: refund.id },
    });
  } catch (error) {
    await failRefund(refund.id);
    throw new ApiError(502, "Refund failed at payment gateway");
  }

  await prisma.refund.update({
    where: { id: refund.id },
    data: { gatewayRefundId: gatewayRefund.id },
  });
  // Razorpay usually processes instantly; otherwise refund.processed finishes it later.
  if (gatewayRefund.status === "processed") await completeRefund(refund.id);

  return prisma.refund.findUnique({ where: { id: refund.id } });
};

// Webhook entry points. notes.refundId is set by createRefund, so it works even if
// the webhook beats the gatewayRefundId write. Refunds made from the Razorpay
// dashboard have neither, and are ignored.
const findRefundId = async (entity) => {
  if (entity?.notes?.refundId) return entity.notes.refundId;
  const refund = await prisma.refund.findUnique({ where: { gatewayRefundId: entity.id } });
  return refund?.id;
};

const handleRefundProcessed = async (entity) => {
  const refundId = await findRefundId(entity);
  if (refundId) await completeRefund(refundId);
};

const handleRefundFailed = async (entity) => {
  const refundId = await findRefundId(entity);
  if (refundId) await failRefund(refundId);
};

module.exports = { createRefund, handleRefundProcessed, handleRefundFailed };
