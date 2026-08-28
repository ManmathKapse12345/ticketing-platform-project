 const WebhookEvent = require("../models/0013_webhookEvent.model.js");

const processWebhookOnce = async (
  gateway,
  providerEventId,
  eventType,
  handler,
) => {
  let event;
  try {
    const eventExists = await WebhookEvent.findOne({
      gateway,
      providerEventId,
      // eventType,
    });
    if (eventExists) {
      // A previous delivery of this event failed — let the gateway's retry reprocess it
      // instead of treating it as an already-handled duplicate.
      if (eventExists.status !== "FAILED") return { duplicate: true };

      const claimed = await WebhookEvent.findOneAndUpdate(
        { _id: eventExists._id, status: "FAILED" },
        { $set: { status: "PROCESSING" } },
        { new: true },
      );
      if (!claimed) return { duplicate: true };
      event = claimed;
    } else {
      event = await WebhookEvent.create({
        gateway,
        providerEventId,
        eventType,
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      const existing = await WebhookEvent.findOne({ gateway, providerEventId });
      if (!existing || existing.status !== "FAILED") {
        return { duplicate: true };
      }

      const claimed = await WebhookEvent.findOneAndUpdate(
        { _id: existing._id, status: "FAILED" },
        { $set: { status: "PROCESSING" } },
        { new: true },
      );
      if (!claimed) {
        return { duplicate: true };
      }
      event = claimed;
    }
    else {
      throw error;
    }
  }

  try {
    await handler();
    event.status = "PROCESSED";
    event.processedAt = new Date();
    await event.save();
    return { duplicate: false };
  } catch (error) {
    await WebhookEvent.updateOne(
      { _id: event._id },
      { $set: { status: "FAILED" } },
    );
    throw error;
  }
};

module.exports = { processWebhookOnce };
