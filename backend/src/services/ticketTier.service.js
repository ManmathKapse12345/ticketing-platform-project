const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");
const { isForeignKeyViolation } = require("../utils/prisma.utils.js");
const { findEventForOrganization } = require("./ownership.service.js");

const createTicketTier = async (eventId, organizationId, tierData) => {
  await findEventForOrganization(eventId, organizationId);

  return prisma.ticketTier.create({
    data: {
      ...tierData,
      eventId,
      organizationId,
    },
  });
};

const listTicketTiers = (eventId, organizationId) =>
  findEventForOrganization(eventId, organizationId).then(() =>
    prisma.ticketTier.findMany({
      where: { eventId, organizationId },
      orderBy: { createdAt: "asc" },
    }),
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

  const { count } = await prisma.ticketTier.updateMany({
    where: { id: ticketTierId, eventId, organizationId },
    data: safeTierData,
  });

  if (count === 0) {
    throw new ApiError(404, "Ticket tier not found for this event");
  }

  return prisma.ticketTier.findUnique({ where: { id: ticketTierId } });
};

const deleteTicketTier = async (ticketTierId, eventId, organizationId) => {
  await findEventForOrganization(eventId, organizationId);

  const ticketTier = await prisma.ticketTier.findFirst({
    where: { id: ticketTierId, eventId, organizationId },
  });

  if (!ticketTier) {
    throw new ApiError(404, "Ticket tier not found for this event");
  }

  try {
    await prisma.ticketTier.delete({ where: { id: ticketTier.id } });
  } catch (err) {
    // OrderItem rows reference the tier, so Postgres refuses to delete it
    if (isForeignKeyViolation(err)) {
      throw new ApiError(409, "Ticket tier has orders and cannot be deleted");
    }
    throw err;
  }

  return ticketTier;
};

module.exports = {
  createTicketTier,
  listTicketTiers,
  updateTicketTier,
  deleteTicketTier,
};
