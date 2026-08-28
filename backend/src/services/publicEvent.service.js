const Event = require("../models/0004_event.model.js");
const TicketTier = require("../models/0005_ticketTier.model.js");
const ApiError = require("../utils/apiError.js");

const listPublishedEvents = () =>
  Event.find({ status: "PUBLISHED" }).sort({ startDate: 1 });

const getPublishedEvent = async (eventId) => {
  const event = await Event.findOne({ _id: eventId, status: "PUBLISHED" });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
};

const listPublicTicketTiers = async (eventId) => {
  await getPublishedEvent(eventId);
  return TicketTier.find({ eventId }).sort({ createdAt: 1 });
};

module.exports = { listPublishedEvents, getPublishedEvent, listPublicTicketTiers };
