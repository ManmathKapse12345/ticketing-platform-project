// backend/src/services/refund.service.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/0006_order.model.js");
const Payment = require("../models/0008_payment.model.js");
const Refund = require("../models/0009_refund.model.js");
const Ticket = require("../models/0007_ticket.model.js");
const ApiError = require("../utils/apiError.js");

const createRefund = async (organizationId, orderId, amountMinor, reason) => {
  const order = await Order.findOne({ _id: orderId, organizationId });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentStatus !== "PAID") {
    throw new ApiError(409, `Order is ${order.paymentStatus.toLowerCase()}, nothing to refund`);
  }

  const payment = await Payment.findOne({ orderId: order._id, status: "SUCCESS" });
  if (!payment) throw new ApiError(404, "No successful payment found for this order");

  const refundAmount = amountMinor ?? payment.amountMinor;
  if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0 || refundAmount > payment.amountMinor) {
    throw new ApiError(400, "Invalid refund amount");
  }

  // Atomic claim: stops two concurrent refund requests from both succeeding.
  const claimedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "SUCCESS" },
    { $set: { status: "REFUNDED" } },
    { new: true },
  );
  if (!claimedPayment) throw new ApiError(409, "Payment was already refunded");

  const refund = await Refund.create({
    organizationId,
    paymentId: payment._id,
    amountMinor: refundAmount,
    reason,
    status: "PENDING",
  });

  try {
    await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      amount: refundAmount,
    });
  } catch (error) {
    // Roll back — don't leave the payment stuck REFUNDED with no actual gateway refund.
    await Payment.updateOne({ _id: payment._id }, { $set: { status: "SUCCESS" } });
    await Refund.updateOne({ _id: refund._id }, { $set: { status: "REJECTED" } });
    throw new ApiError(502, "Refund failed at payment gateway");
  }

  refund.status = "APPROVED";
  await refund.save();

  if (refundAmount === payment.amountMinor) {
    order.paymentStatus = "REFUNDED";
    await order.save();
    await Ticket.updateMany(
      { orderId: order._id, status: "active" },
      { $set: { status: "cancelled" } },
    );
  }

  return refund;
};

module.exports = { createRefund };
