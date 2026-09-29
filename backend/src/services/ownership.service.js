const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

// `db` lets a caller run the lookup inside its own prisma.$transaction (pass `tx`).
const findEventForOrganization = async (
  eventId,
  organizationId,
  db = prisma,
) => {
  const event = await db.event.findFirst({
    where: { id: eventId, organizationId },
  });

  if (!event) {
    throw new ApiError(404, "Event not found for this organization");
  }

  return event;
};

const findTicketTierForOrganization = async (
  ticketTierId,
  organizationId,
  db = prisma,
) => {
  const ticketTier = await db.ticketTier.findFirst({
    where: { id: ticketTierId, organizationId },
  });

  if (!ticketTier) {
    throw new ApiError(404, "Ticket tier not found for this organization");
  }

  return ticketTier;
};

const findOrderForOrganization = async (
  orderId,
  organizationId,
  db = prisma,
) => {
  const order = await db.order.findFirst({
    where: { id: orderId, organizationId },
    include: { items: true },
  });

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
