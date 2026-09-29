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

module.exports = { makeUser, makeOrganization, makeEvent, makeTier, makeOrder };
