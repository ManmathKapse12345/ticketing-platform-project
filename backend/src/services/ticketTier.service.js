const TicketTier = require("../models/0005_ticketTier.model.js");
const ApiError = require("../utils/apiError.js");
const { findEventForOrganization } = require("./ownership.service.js");

const createTicketTier = async (eventId, organizationId, tierData) => {
  await findEventForOrganization(eventId, organizationId);

  return TicketTier.create({
    ...tierData,
    eventId,
    organizationId,
  });
};

const listTicketTiers = (eventId, organizationId) =>
  findEventForOrganization(eventId, organizationId).then(() =>
    TicketTier.find({ eventId, organizationId }).sort({ createdAt: 1 }),
  );

const updateTicketTier = async (
  ticketTierId,
  eventId,
  organizationId,
  tierData,
) => {
  await findEventForOrganization(eventId, organizationId);
  const {
    eventId: ignoredEventId,
    organizationId: ignoredOrganizationId,
    ...safeTierData
  } = tierData;

  const ticketTier = await TicketTier.findOneAndUpdate(
    { _id: ticketTierId, eventId, organizationId },
    { $set: safeTierData },
    { new: true, runValidators: true },
  );

  if (!ticketTier) {
    throw new ApiError(404, "Ticket tier not found for this event");
  }

  return ticketTier;
};

const deleteTicketTier = async (ticketTierId, eventId, organizationId) => {
  await findEventForOrganization(eventId, organizationId);

  const ticketTier = await TicketTier.findOneAndDelete({
    _id: ticketTierId,
    eventId,
    organizationId,
  });

  if (!ticketTier) {
    throw new ApiError(404, "Ticket tier not found for this event");
  }

  return ticketTier;
};

module.exports = {
  createTicketTier,
  listTicketTiers,
  updateTicketTier,
  deleteTicketTier,
};
