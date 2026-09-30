const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

const listPublishedEvents = async ({ page, limit, from, to, search }) => {
  const where = {
    status: "PUBLISHED",
    // Default to upcoming events; pass ?from= to look further back
    startDate: { gte: from ?? new Date(), ...(to && { lte: to }) },
    ...(search && {
      OR: [
        {title: {contains: search, mode: "insensitive" } },
        { venue: { contains: search, mode: "insensitive"}},
        {description: { contains: search, mode: "insensitive"}},
      ],
    }),
  };

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
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
