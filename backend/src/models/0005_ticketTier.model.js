// models/TicketTier.js

const mongoose = require("mongoose");

const ticketTierSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    priceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    quantityTotal: {
      type: Number,
      required: true,
    },
    quantitySold: {
      type: Number,
      default: 0,
    },
    salesStart: Date,
    salesEnd: Date,
  },
  {
    timestamps: true,
  },
);

ticketTierSchema.index({ eventId: 1, organizationId: 1 });

module.exports = mongoose.model("TicketTier", ticketTierSchema);
