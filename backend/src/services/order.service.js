const { assertMinorUnits } = require("../utils/money.utils.js");
const Order = require("../models/0006_order.model.js");
const TicketTier = require("../models/0005_ticketTier.model.js");
const Ticket = require("../models/0007_ticket.model.js");
const ApiError = require("../utils/apiError.js");
const Payment = require("../models/0008_payment.model.js");
const { signTicketQr } = require("../utils/qr.utils.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createOrder = async (
  userId,
  organizationId,
  eventId,
  requestedItems,
  idempotencyKey,
) => {
  const existing = await Order.findOne({ userId, idempotencyKey });
  if (existing) return existing;

  const reservedTiers = [];
  const releaseReservedTiers = () =>
    Promise.all(
      reservedTiers.map(({ tier, quantity }) =>
        TicketTier.updateOne({ _id: tier._id }, { $inc: { quantitySold: -quantity } }),
      ),
    );

  try {
    for (const { ticketTier, quantity } of requestedItems) {
      // Read first so a bad request gets a specific, useful error message —
      // "not on sale yet" vs "sold out" vs "doesn't exist" — instead of one generic 409.
      const tierSnapshot = await TicketTier.findOne({
        _id: ticketTier,
        eventId,
        organizationId,
      });
      if (!tierSnapshot) {
        throw new ApiError(404, "Ticket tier not found for this event");
      }

      const now = new Date();
      if (tierSnapshot.salesStart && now < tierSnapshot.salesStart) {
        throw new ApiError(400, `Sales for "${tierSnapshot.name}" have not started yet`);
      }
      if (tierSnapshot.salesEnd && now > tierSnapshot.salesEnd) {
        throw new ApiError(400, `Sales for "${tierSnapshot.name}" have ended`);
      }

      // The actual concurrency guard: this filter is re-checked atomically against
      // whatever quantitySold is *right now*, so two buyers racing for the last seats
      // can't both succeed — same pattern as refresh-token rotation.
      const tier = await TicketTier.findOneAndUpdate(
        {
          _id: ticketTier,
          eventId,
          organizationId,
          $expr: {
            $lte: [{ $add: ["$quantitySold", quantity] }, "$quantityTotal"],
          },
        },
        { $inc: { quantitySold: quantity } },
        { new: true },
      );
      if (!tier) {
        throw new ApiError(409, `"${tierSnapshot.name}" is sold out`);
      }
      reservedTiers.push({ tier, quantity });
    }

    const items = reservedTiers.map(({ tier, quantity }) => {
      const unitPriceMinor = tier.priceMinor;
      const subtotalMinor = unitPriceMinor * quantity;
      return {
        eventId: tier.eventId,
        ticketTier: tier._id,
        tierName: tier.name,
        quantity,
        unitPriceMinor,
        subtotalMinor,
      };
    });

    const subtotalMinor = items.reduce(
      (sum, item) => sum + item.subtotalMinor,
      0,
    );
    const feesMinor = 0;
    const totalAmountMinor = subtotalMinor + feesMinor;

    assertMinorUnits(subtotalMinor);
    assertMinorUnits(totalAmountMinor);

    return await Order.create({
      userId,
      organizationId,
      eventId,
      items,
      currency: "USD",
      subtotalMinor,
      feesMinor,
      totalAmountMinor,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      idempotencyKey,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Another concurrent request with the same idempotencyKey won the race and
      // already created the order — release the inventory we reserved and return theirs.
      const raced = await Order.findOne({ userId, idempotencyKey });
      await releaseReservedTiers();
      if (raced) return raced;
      throw err;
    }
    // Any other failure (sold out partway through, validation error, etc.) —
    // release whatever inventory this attempt reserved before it failed.
    await releaseReservedTiers();
    throw err;
  }
};

const expireOrder = async (orderId) => {
    const order = await Order.findOneAndUpdate(
        {_id:orderId,paymentStatus:"PENDING",expiresAt:{ $lte: new Date() }},
        {$set: { paymentStatus: "CANCELLED"}},
        {new: true},
    );
    if(!order)  return null;
    await Promise.all(
        order.items.map((item) =>
            TicketTier.updateOne(
                {_id: item.ticketTier},
                {$inc: {quantitySold: -item.quantity }},
            ), 
        ),
    );
    return order;
};

const getOrder = async (orderId, userId) => {
    await expireOrder(orderId);
    const order = await Order.findOne({ _id: orderId, userId });
    if(!order)  throw new ApiError(404,"Order not found");
    return order;
};

const getAllOrder = async (userId) => {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  const stillPending = orders.filter((order) => order.paymentStatus === "PENDING");
  if (stillPending.length > 0) {
    await Promise.all(stillPending.map((order) => expireOrder(order._id)));
    // re-fetch: the array above is a pre-expiry snapshot, so any order just
    // flipped to CANCELLED by expireOrder would otherwise still read PENDING here
    return Order.find({ userId }).sort({ createdAt: -1 });
  }

  return orders;
}
const listOrganizationOrders = (organizationId) =>
  Order.find({ organizationId }).sort({ createdAt: -1 });

const getOrganizationOrder = async (organizationId, orderId) => {
  const order = await Order.findOne({ _id: orderId, organizationId });
  if (!order) throw new ApiError(404, "Order not found for this organization");
  return order;
};

const sweepExpiredOrders = async () => {
    const expired = await Order.find({
        paymentStatus: "PENDING",
        expiresAt: { $lte: new Date() },
    }).select("_id");

    for(const { _id } of expired){
        await expireOrder(_id);
    }
};

const paymentIntent = async (orderId, userId) => {
  const order = await Order.findOne({ _id: orderId, userId: userId});
  if(!order)  throw new ApiError(404,"Order not found");
  await expireOrder(order._id);
  const fresh = await Order.findById(order._id);
  if(fresh.paymentStatus !== "PENDING"){
    throw new ApiError(409,`Order is ${fresh.paymentStatus.toLocaleLowerCase()}, cannot pay`);
  }
  const existingPayment = await Payment.findOne({ orderId:order._id,status:{$ne:"FAILED"}});
  if(existingPayment){
    const existingIntent = await stripe.paymentIntents.retrieve(existingPayment.paymentIntentId);
    return existingIntent.client_secret;
  }
  const intent = await stripe.paymentIntents.create({
    amount:order.totalAmountMinor,
    currency:order.currency.toLowerCase(),
    metadata: { orderId: order._id.toString(), userId:userId.toString()},
  });
  await Payment.create({
    organizationId:order.organizationId,
    orderId:order._id,
    gateway:"STRIPE",
    paymentIntentId:intent.id,
    status:"PENDING",
    amountMinor:order.totalAmountMinor,
  });
  return intent.client_secret;
}

const fulfillPaidOrder = async (orderId, paymentIntentId) => {
  const order = await Order.findOneAndUpdate(
    { _id :orderId, paymentStatus: "PENDING" },
    {$set: { paymentStatus: "PAID" }},
    {new:true},
  );

  if(!order)  return;

  await Payment.updateOne(
    { paymentIntentId },
    { $set: { status: "SUCCESS" }},
  )

  const ticketDocs = order.items.flatMap((item) =>
    Array.from({length:item.quantity}, () => ({
      orderId:order._id,
      eventId:item.eventId,
      organizationId:order.organizationId,
      ownerUserId:order.userId,
    })),
  );

  for (const doc of ticketDocs) {
    const ticket = new Ticket(doc);
    ticket.qrCode = signTicketQr({
      ticketId: ticket._id.toString(),
      eventId: ticket.eventId.toString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // TODO: use event end date instead
    });
    await ticket.save();
  }
};

module.exports = {
  createOrder,
  expireOrder,
  getOrder,
  sweepExpiredOrders,
  getAllOrder,
  paymentIntent,
  fulfillPaidOrder,
  listOrganizationOrders,
  getOrganizationOrder,
};
