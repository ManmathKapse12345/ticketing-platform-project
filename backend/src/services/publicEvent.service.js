const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

const listPublishedEvents = () =>
  prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { startDate: "asc" },
  });

const getPublishedEvent = async (eventId) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, status: "PUBLISHED" },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
};

const listPublicTicketTiers = async (eventId) => {
  await getPublishedEvent(eventId);
  return prisma.ticketTier.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
};

module.exports = { listPublishedEvents, getPublishedEvent, listPublicTicketTiers };
