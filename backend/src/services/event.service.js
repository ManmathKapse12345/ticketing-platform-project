const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");
const { findEventForOrganization } = require("./ownership.service.js");
const { createRefund } = require("./refund.service.js");
const { cancelPendingOrder } = require("./order.service.js");

const createEvent = async (organizationId, eventData) =>
  prisma.event.create({
    data: {
      ...eventData,
      organizationId,
    },
  });

const listEvents = (organizationId) =>
  prisma.event.findMany({
    where: { organizationId },
    orderBy: { startDate: "asc" },
  });

const getEvent = (eventId, organizationId) =>
  findEventForOrganization(eventId, organizationId);

// updateMany scopes the write to this organization in one statement;
// count 0 means the event doesn't exist or belongs to another organization.
const updateEventForOrganization = async (eventId, organizationId, data) => {
  const { count } = await prisma.event.updateMany({
    where: { id: eventId, organizationId },
    data,
  });

  if (count === 0) {
    throw new ApiError(404, "Event not found for this organization");
  }

  return prisma.event.findUnique({ where: { id: eventId } });
};

const updateEvent = async (eventId, organizationId, eventData) => {
  const { organizationId: ignoredOrganizationId, ...safeEventData } = eventData;
  return updateEventForOrganization(eventId, organizationId, safeEventData);
};

const cancelEvent = async (eventId, organizationId) => {
  const event = await updateEventForOrganization(eventId, organizationId, { 
    status: "CANCELLED", 
  });

  await prisma.ticket.updateMany({
    where: { eventId, organizationId, status: "active" },
    data: { status: "cancelled" },
  });

  const pendingOrders = await prisma.order.findMany({
    where: { eventId, organizationId, paymentStatus: "PENDING" },
    select: { id: true },
  });
  for(const { id } of pendingOrders) {
    await cancelPendingOrder(id);
  }

  const paidOrders = await prisma.order.findMany({
    where: { eventId, organizationId, paymentStatus: "PAID" },
    select: { id: true },
  });
  const failed = [];
  for (const { id } of paidOrders) {
    try {
      await createRefund(organizationId, id, undefined, "Event cancelled");
    } catch (error) {
      failed.push({ orderId: id, message: error.message });
    }
  }

  return {
    event,
    refunds: { requested: paidOrders.length - failed.length, failed },
  };
};

module.exports = { createEvent, listEvents, getEvent, updateEvent, cancelEvent };
