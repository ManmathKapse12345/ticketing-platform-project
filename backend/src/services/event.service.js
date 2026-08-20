const Event = require("../models/0004_event.model.js");
const ApiError = require("../utils/apiError.js");
const { findEventForOrganization } = require("./ownership.service.js");

const createEvent = async (organizationId, eventData) =>
  Event.create({
    ...eventData,
    organizationId,
  });

const listEvents = (organizationId) =>
  Event.find({ organizationId }).sort({ startDate: 1 });

const getEvent = (eventId, organizationId) =>
  findEventForOrganization(eventId, organizationId);

const updateEvent = async (eventId, organizationId, eventData) => {
  const { organizationId: ignoredOrganizationId, ...safeEventData } = eventData;
  const event = await Event.findOneAndUpdate(
    { _id: eventId, organizationId },
    { $set: safeEventData },
    { new: true, runValidators: true },
  );

  if (!event) {
    throw new ApiError(404, "Event not found for this organization");
  }

  return event;
};

const cancelEvent = async (eventId, organizationId) => {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, organizationId },
    { $set: { status: "CANCELLED" } },
    { new: true, runValidators: true },
  );

  if (!event) {
    throw new ApiError(404, "Event not found for this organization");
  }

  return event;
};

module.exports = { createEvent, listEvents, getEvent, updateEvent, cancelEvent };
