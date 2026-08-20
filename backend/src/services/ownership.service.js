const Event = require("../models/0004_event.model.js");
const TicketTier = require("../models/0005_ticketTier.model.js");
const Order = require("../models/0006_order.model.js");
const ApiError = require("../utils/apiError.js");

const findEventForOrganization = async (
  eventId,
  organizationId,
  options = {},
) => {
  const event = await Event.findOne({
    _id: eventId,
    organizationId,
  }).setOptions(options);

  if (!event) {
    throw new ApiError(404, "Event not found for this organization");
  }

  return event;
};

const findTicketTierForOrganization = async (
  ticketTierId,
  organizationId,
  options = {},
) => {
  const ticketTier = await TicketTier.findOne({
    _id: ticketTierId,
    organizationId,
  }).setOptions(options);

  if (!ticketTier) {
    throw new ApiError(404, "Ticket tier not found for this organization");
  }

  return ticketTier;
};

const findOrderForOrganization = async (
  orderId,
  organizationId,
  options = {},
) => {
  const order = await Order.findOne({
    _id: orderId,
    organizationId,
  }).setOptions(options);

  if (!order) {
    throw new ApiError(404, "Order not found for this organization");
  }

  return order;
};

module.exports = {
  findEventForOrganization,
  findTicketTierForOrganization,
  findOrderForOrganization,
};
