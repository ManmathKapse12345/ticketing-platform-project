// models/Payment.js

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    gateway: {
      type: String,
      enum: ["STRIPE", "RAZORPAY"],
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    providerEventId: {
      type: String,
      sparse: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentIntentId: 1 }, { unique: true });

module.exports = mongoose.model("Payment", paymentSchema);
