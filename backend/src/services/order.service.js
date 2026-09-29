const crypto = require("crypto");
const { assertMinorUnits } = require("../utils/money.utils.js");
const ApiError = require("../utils/apiError.js");
const { isUniqueViolation } = require("../utils/prisma.utils.js");
const { signTicketQr } = require("../utils/qr.utils.js");
const { verifyPaymentSignature } = require("../utils/razorpay.utils.js");
const getRazorpay = require("../config/razorpay.js");
const prisma = require("../config/prisma.js");

const createOrder = async (
  userId,
  organizationId,
  eventId,
  requestedItems,
  idempotencyKey,
) => {
  const findExisting = () =>
    prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: { items: true },
    });

  const existing = await findExisting();
  if (existing) return existing;

  try {
    // Everything below runs in one transaction: if any item is unavailable, or the
    // order insert fails, every seat reserved so far is rolled back automatically.
    return await prisma.$transaction(async (tx) => {
      const items = [];

      for (const { ticketTier, quantity } of requestedItems) {
        // Read first so a bad request gets a specific, useful error message —
        // "not on sale yet" vs "sold out" vs "doesn't exist" — instead of one generic 409.
        const tier = await tx.ticketTier.findFirst({
          where: { id: ticketTier, eventId, organizationId },
        });
        if (!tier) {
          throw new ApiError(404, "Ticket tier not found for this event");
        }

        const now = new Date();
        if (tier.salesStart && now < tier.salesStart) {
          throw new ApiError(400, `Sales for "${tier.name}" have not started yet`);
        }
        if (tier.salesEnd && now > tier.salesEnd) {
          throw new ApiError(400, `Sales for "${tier.name}" have ended`);
        }

        // The actual concurrency guard: Postgres re-checks this WHERE clause while it
        // holds the row lock, so two buyers racing for the last seats can't both
        // succeed. Returns the number of rows updated — 0 means not enough seats left.
        const reserved = await tx.$executeRaw`
          UPDATE "TicketTier"
          SET "quantitySold" = "quantitySold" + ${quantity}, "updatedAt" = NOW()
          WHERE id = ${tier.id}::uuid
            AND "quantitySold" + ${quantity} <= "quantityTotal"`;
        if (reserved === 0) {
          throw new ApiError(409, `"${tier.name}" is sold out`);
        }

        items.push({
          eventId: tier.eventId,
          ticketTierId: tier.id,
          tierName: tier.name,
          quantity,
          unitPriceMinor: tier.priceMinor,
          subtotalMinor: tier.priceMinor * quantity,
        });
      }

      const subtotalMinor = items.reduce(
        (sum, item) => sum + item.subtotalMinor,
        0,
      );
      const feesMinor = 0;
      const totalAmountMinor = subtotalMinor + feesMinor;

      assertMinorUnits(subtotalMinor);
      assertMinorUnits(totalAmountMinor);

      return tx.order.create({
        data: {
          userId,
          organizationId,
          eventId,
          currency: "INR",
          subtotalMinor,
          feesMinor,
          totalAmountMinor,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          idempotencyKey,
          items: { create: items },
        },
        include: { items: true },
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Another concurrent request with the same idempotencyKey won the race and
      // already created the order. Our reservations were rolled back — return theirs.
      const raced = await findExisting();
      if (raced) return raced;
    }
    throw err;
  }
};

const expireOrder = (orderId) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "PENDING", expiresAt: { lte: new Date() } },
      data: { paymentStatus: "CANCELLED" },
    });
    if (count === 0) return null;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    for (const item of order.items) {
      await tx.ticketTier.update({
        where: { id: item.ticketTierId },
        data: { quantitySold: { decrement: item.quantity } },
      });
    }
    return order;
  });

const getOrder = async (orderId, userId) => {
    await expireOrder(orderId);
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if(!order)  throw new ApiError(404,"Order not found");
    return order;
};

const findUserOrders = (userId) =>
  prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

const getAllOrder = async (userId) => {
  const orders = await findUserOrders(userId);

  const stillPending = orders.filter((order) => order.paymentStatus === "PENDING");
  if (stillPending.length > 0) {
    await Promise.all(stillPending.map((order) => expireOrder(order.id)));
    // re-fetch: the array above is a pre-expiry snapshot, so any order just
    // flipped to CANCELLED by expireOrder would otherwise still read PENDING here
    return findUserOrders(userId);
  }

  return orders;
}

const listOrganizationOrders = (organizationId) =>
  prisma.order.findMany({
    where: { organizationId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

const getOrganizationOrder = async (organizationId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, organizationId },
    include: { items: true },
  });
  if (!order) throw new ApiError(404, "Order not found for this organization");
  return order;
};

const sweepExpiredOrders = async () => {
    const expired = await prisma.order.findMany({
        where: { paymentStatus: "PENDING", expiresAt: { lte: new Date() } },
        select: { id: true },
    });

    for(const { id } of expired){
        await expireOrder(id);
    }
};

// Everything the frontend needs to open Razorpay Checkout.js for this order.
const toCheckout = (payment, order) => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  razorpayOrderId: payment.gatewayOrderId,
  amount: payment.amountMinor,
  currency: order.currency,
});

const createCheckout = async (orderId, userId) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if(!order)  throw new ApiError(404,"Order not found");
  await expireOrder(order.id);
  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  if(fresh.paymentStatus !== "PENDING"){
    throw new ApiError(409,`Order is ${fresh.paymentStatus.toLocaleLowerCase()}, cannot pay`);
  }
  // Reuse the Razorpay order from an earlier attempt unless that payment failed.
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId: order.id, status: { not: "FAILED" } },
  });
  if(existingPayment){
    return toCheckout(existingPayment, fresh);
  }
  const razorpayOrder = await getRazorpay().orders.create({
    amount:fresh.totalAmountMinor,
    currency:fresh.currency,
    receipt:fresh.id,
    notes: { orderId: fresh.id, userId },
  });
  const payment = await prisma.payment.create({
    data: {
      organizationId:fresh.organizationId,
      orderId:fresh.id,
      gateway:"RAZORPAY",
      gatewayOrderId:razorpayOrder.id,
      status:"PENDING",
      amountMinor:fresh.totalAmountMinor,
    },
  });
  return toCheckout(payment, fresh);
}

// Called by the frontend with what Razorpay Checkout returned after a successful
// payment. The payment.captured webhook fulfils the same order if this never arrives.
const verifyCheckoutPayment = async (
  orderId,
  userId,
  { razorpayOrderId, razorpayPaymentId, razorpaySignature },
) => {
  const payment = await prisma.payment.findFirst({
    where: { gatewayOrderId: razorpayOrderId, orderId, order: { userId } },
  });
  if(!payment)  throw new ApiError(404,"Payment not found for this order");

  if(!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)){
    throw new ApiError(400,"Invalid payment signature");
  }

  await fulfillPaidOrder(razorpayOrderId, razorpayPaymentId);
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

// Idempotent: safe to call from both verify-payment and the webhook, in any order.
const fulfillPaidOrder = async (gatewayOrderId, gatewayPaymentId, amountMinor) => {
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId } });
  // Not one of our checkouts (e.g. a payment made elsewhere on the same Razorpay account):
  // nothing to fulfil, and throwing would make Razorpay retry the webhook for a day.
  if(!payment)  return;
  if(amountMinor !== undefined && amountMinor !== payment.amountMinor){
    throw new ApiError(400,"Paid amount does not match the order total");
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: payment.orderId, paymentStatus: "PENDING" },
      data: { paymentStatus: "PAID" },
    });

    if(count === 0)  return;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", gatewayPaymentId },
    });

    const order = await tx.order.findUnique({
      where: { id: payment.orderId },
      include: { items: true },
    });

    // The ticket id is generated up front because it's signed into its own QR code.
    const tickets = order.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => {
        const id = crypto.randomUUID();
        return {
          id,
          orderId: order.id,
          eventId: item.eventId,
          organizationId: order.organizationId,
          ownerUserId: order.userId,
          qrCode: signTicketQr({
            ticketId: id,
            eventId: item.eventId,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // TODO: use event end date instead
          }),
        };
      }),
    );

    await tx.ticket.createMany({ data: tickets });
  });
};

// payment.failed webhook: mark the attempt FAILED so the next checkout creates a fresh Razorpay order.
const markPaymentFailed = (gatewayOrderId) =>
  prisma.payment.updateMany({
    where: { gatewayOrderId, status: "PENDING" },
    data: { status: "FAILED" },
  });

module.exports = {
  createOrder,
  expireOrder,
  getOrder,
  sweepExpiredOrders,
  getAllOrder,
  createCheckout,
  verifyCheckoutPayment,
  fulfillPaidOrder,
  markPaymentFailed,
  listOrganizationOrders,
  getOrganizationOrder,
};
