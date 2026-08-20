// models/Order.js

const mongoose = require("mongoose");
const orderItemSchema = require("./0012_orderItemSchema.model");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items) => items.length > 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "USD",
    },
    subtotalMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    feesMinor: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isSafeInteger,
    },
    totalAmountMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED", "REFUNDED"],
      default: "PENDING",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
// orderSchema.index({ eventId: 1 });

module.exports = mongoose.model("Order", orderSchema);
