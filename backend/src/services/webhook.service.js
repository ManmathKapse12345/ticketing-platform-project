const WebhookEvent = require("../models/0013_webhookEvent.model.js");

const processWebhookOnce = async (
  gateway,
  providerEventId,
  eventType,
  handler,
) => {
  let event;
  try {
    event = await WebhookEvent.create({
      gateway,
      providerEventId,
      eventType,
    });
  } catch (error) {
    if (error.code === 11000) {
      event = await WebhookEvent.findOne({ gateway, providerEventId });
      if (!event || event.status === "PROCESSED") {
        return { duplicate: true };
      }

      const claimed = await WebhookEvent.findOneAndUpdate(
        { _id: event._id, status: "FAILED" },
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
