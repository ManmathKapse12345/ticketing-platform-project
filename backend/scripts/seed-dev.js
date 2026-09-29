// Fills the dev database with everything needed to test a payment end-to-end:
// a verified customer, an organization owner, a published event and a ticket tier.
// Safe to run repeatedly — existing rows are reused rather than duplicated.
//
//   npm run seed:dev
require("dotenv").config({ quiet: true });
const prisma = require("../src/config/prisma.js");
const { hashPassword } = require("../src/utils/auth.utils.js");

const PASSWORD = "Password123!";
const CUSTOMER_EMAIL = "customer@test.local";
const OWNER_EMAIL = "owner@test.local";
const ORGANIZATION_NAME = "Demo Events Co";
const EVENT_TITLE = "Demo Concert";
const TIER_NAME = "General Admission";

const upsertVerifiedUser = async (email, name, password) =>
  prisma.user.upsert({
    where: { email },
    update: { isVerified: true },
    create: { email, name, password, role: "customer", isVerified: true },
  });

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed:dev must never run against production");
  }

  const password = await hashPassword(PASSWORD);
  await upsertVerifiedUser(CUSTOMER_EMAIL, "Test Customer", password);
  const owner = await upsertVerifiedUser(OWNER_EMAIL, "Test Owner", password);

  const organization = await prisma.organization.upsert({
    where: { name: ORGANIZATION_NAME },
    update: {},
    create: {
      name: ORGANIZATION_NAME,
      primaryColor: "#2563eb",
      members: { create: { userId: owner.id, role: "owner" } },
    },
  });

  const eventData = {
    status: "PUBLISHED",
    venue: "Test Arena, Pune",
    description: "Seeded event for testing Razorpay payments.",
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  const existingEvent = await prisma.event.findFirst({
    where: { organizationId: organization.id, title: EVENT_TITLE },
  });
  const event = existingEvent
    ? await prisma.event.update({ where: { id: existingEvent.id }, data: eventData })
    : await prisma.event.create({
        data: { ...eventData, title: EVENT_TITLE, organizationId: organization.id },
      });

  const tierData = {
    priceMinor: 49900, // ₹499.00 in paise
    quantityTotal: 100,
    salesStart: null,
    salesEnd: null,
  };
  const existingTier = await prisma.ticketTier.findFirst({
    where: { eventId: event.id, name: TIER_NAME },
  });
  const tier = existingTier
    ? await prisma.ticketTier.update({ where: { id: existingTier.id }, data: tierData })
    : await prisma.ticketTier.create({
        data: {
          ...tierData,
          name: TIER_NAME,
          eventId: event.id,
          organizationId: organization.id,
        },
      });

  console.log("\nDev data ready:\n");
  console.log(`  Customer login : ${CUSTOMER_EMAIL} / ${PASSWORD}`);
  console.log(`  Owner login    : ${OWNER_EMAIL} / ${PASSWORD}`);
  console.log(`  Organization   : ${organization.name} (${organization.id})`);
  console.log(`  Event          : ${event.title} (${event.id})`);
  console.log(`  Ticket tier    : ${tier.name}, ₹${(tier.priceMinor / 100).toFixed(2)}, ${tier.quantityTotal - tier.quantitySold} left`);
  console.log(`\n  Test checkout  : http://localhost:${process.env.PORT || 5000}/dev/checkout\n`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
