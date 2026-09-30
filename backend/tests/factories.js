const crypto = require("crypto");
const prisma = require("../src/config/prisma.js");

// Postgres enforces foreign keys, so tests create real parent rows
// (user -> organization -> event -> tier) instead of random ids.

const makeUser = (overrides = {}) =>
  prisma.user.create({
    data: {
      name: "Test User",
      email: `user-${crypto.randomUUID()}@example.com`,
      password: "hashed-password",
      ...overrides,
    },
  });

const makeOrganization = (overrides = {}) =>
  prisma.organization.create({
    data: { name: `Org ${crypto.randomUUID()}`, ...overrides },
  });

const makeEvent = async (overrides = {}) => {
  const organizationId = overrides.organizationId ?? (await makeOrganization()).id;
  return prisma.event.create({
    data: {
      title: "Test Event",
      status: "PUBLISHED",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
      organizationId,
    },
  });
};

const makeTier = async (overrides = {}) => {
  const event = overrides.eventId
    ? await prisma.event.findUnique({ where: { id: overrides.eventId } })
    : await makeEvent();
  return prisma.ticketTier.create({
    data: {
      name: "General",
      priceMinor: 1000,
      quantityTotal: 10,
      quantitySold: 0,
      ...overrides,
      eventId: event.id,
      organizationId: event.organizationId,
    },
  });
};

const makeOrder = async (overrides = {}) => {
  const event = overrides.eventId
    ? await prisma.event.findUnique({ where: { id: overrides.eventId } })
    : await makeEvent();
  const userId = overrides.userId ?? (await makeUser()).id;
  return prisma.order.create({
    data: {
      subtotalMinor: 1000,
      totalAmountMinor: 1000,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      idempotencyKey: crypto.randomUUID(),
      ...overrides,
      userId,
      eventId: event.id,
      organizationId: event.organizationId,
    },
  });
};

// 2 seats at 1000 each, paid, with tickets issued.
const makePaidOrder = async ({ eventId } = {}) => {
  const tier = await makeTier({ quantitySold: 2, ...(eventId && { eventId }) });
  const { id: userId } = await makeUser();
  const order = await prisma.order.create({
    data: {
      userId, organizationId: tier.organizationId, eventId: tier.eventId,
      subtotalMinor: 2000, totalAmountMinor: 2000, paymentStatus: "PAID",
      expiresAt: new Date(), idempotencyKey: crypto.randomUUID(),
      items: { create: [{ eventId: tier.eventId, ticketTierId: tier.id, tierName: tier.name,
        quantity: 2, unitPriceMinor: 1000, subtotalMinor: 2000 }] },
    },
  });
  const payment = await prisma.payment.create({
    data: { organizationId: tier.organizationId, orderId: order.id, gateway: "RAZORPAY",
      gatewayOrderId: `order_${crypto.randomUUID()}`, gatewayPaymentId: `pay_${crypto.randomUUID()}`,
      status: "SUCCESS", amountMinor: 2000 },
  });
  await prisma.ticket.createMany({
    data: [1, 2].map(() => ({ orderId: order.id, eventId: tier.eventId,
      organizationId: tier.organizationId, ownerUserId: userId, qrCode: `qr-${crypto.randomUUID()}` })),
  });
  return { order, tier, payment };
};

module.exports = { makeUser, makeOrganization, makeEvent, makeTier, makeOrder, makePaidOrder };

