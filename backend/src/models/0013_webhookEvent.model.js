const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      enum: ["STRIPE", "RAZORPAY"],
      required: true,
    },
    providerEventId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PROCESSING", "PROCESSED", "FAILED"],
      default: "PROCESSING",
    },
    processedAt: Date,
  },
  { timestamps: true },
);

webhookEventSchema.index({ gateway: 1, providerEventId: 1 }, { unique: true });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
