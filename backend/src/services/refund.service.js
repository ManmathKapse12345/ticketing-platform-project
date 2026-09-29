// backend/src/services/refund.service.js
const getRazorpay = require("../config/razorpay.js");
const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

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

  const refundAmount = amountMinor ?? payment.amountMinor;
  if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0 || refundAmount > payment.amountMinor) {
    throw new ApiError(400, "Invalid refund amount");
  }

  // Atomic claim: stops two concurrent refund requests from both succeeding.
  const { count } = await prisma.payment.updateMany({
    where: { id: payment.id, status: "SUCCESS" },
    data: { status: "REFUNDED" },
  });
  if (count === 0) throw new ApiError(409, "Payment was already refunded");

  const refund = await prisma.refund.create({
    data: {
      organizationId,
      paymentId: payment.id,
      amountMinor: refundAmount,
      reason,
      status: "PENDING",
    },
  });

  try {
    await getRazorpay().payments.refund(payment.gatewayPaymentId, {
      amount: refundAmount,
      notes: { orderId: order.id, refundId: refund.id },
    });
  } catch (error) {
    // Roll back — don't leave the payment stuck REFUNDED with no actual gateway refund.
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } });
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "REJECTED" } });
    throw new ApiError(502, "Refund failed at payment gateway");
  }

  const approvedRefund = await prisma.refund.update({
    where: { id: refund.id },
    data: { status: "APPROVED" },
  });

  if (refundAmount === payment.amountMinor) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUNDED" },
      }),
      prisma.ticket.updateMany({
        where: { orderId: order.id, status: "active" },
        data: { status: "cancelled" },
      }),
    ]);
  }

  return approvedRefund;
};

module.exports = { createRefund };
