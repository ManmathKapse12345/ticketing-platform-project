const dbHandler = require("./dbHandler");
const prisma = require("../src/config/prisma.js");
const { makeEvent, makeOrganization, makeTier, makePaidOrder } = require("./factories");
const {
  getEventAnalytics,
  getDailySales,
  getOrganizationOverview,
} = require("../src/services/analytics.service.js");
const {
  getPublishedEvent,
  listPublicTicketTiers,
} = require("../src/services/publicEvent.service.js");

beforeAll(() => dbHandler.connect());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

const range = { from: new Date("2000-01-01"), to: new Date("2100-01-01") };

describe("getEventAnalytics", () => {
  it("counts only paid seats and revenue, not pending reservations", async () => {
    const event = await makeEvent();
    await makePaidOrder({ eventId: event.id });
    await makePaidOrder({ eventId: event.id });
    // Seats held by a pending order bump quantitySold but aren't sales.
    await makeTier({ eventId: event.id, name: "VIP", quantitySold: 3 });

    const { revenue, tiers } = await getEventAnalytics(event.id, event.organizationId, range);

    expect(revenue).toEqual({ grossMinor: 4000, refundedMinor: 0, netMinor: 4000, paidOrders: 2 });
    expect(tiers.reduce((sum, t) => sum + t.sold, 0)).toBe(4);
    expect(tiers.find((t) => t.name === "VIP")).toMatchObject({ sold: 0, revenueMinor: 0 });
  });

  it("subtracts approved refunds but not pending ones", async () => {
    const event = await makeEvent();
    const { payment } = await makePaidOrder({ eventId: event.id });
    await prisma.refund.createMany({
      data: [
        { organizationId: event.organizationId, paymentId: payment.id, amountMinor: 500, status: "APPROVED" },
        { organizationId: event.organizationId, paymentId: payment.id, amountMinor: 300, status: "PENDING" },
      ],
    });

    const { revenue } = await getEventAnalytics(event.id, event.organizationId, range);
    expect(revenue).toMatchObject({ grossMinor: 2000, refundedMinor: 500, netMinor: 1500 });
  });

  it("computes attendance from checked-in tickets, ignoring cancelled ones", async () => {
    const event = await makeEvent();
    const { order } = await makePaidOrder({ eventId: event.id });
    await makePaidOrder({ eventId: event.id });
    const [first, second] = await prisma.ticket.findMany({ where: { orderId: order.id } });
    await prisma.ticket.update({ where: { id: first.id }, data: { status: "used" } });
    await prisma.ticket.update({ where: { id: second.id }, data: { status: "cancelled" } });

    const { attendance } = await getEventAnalytics(event.id, event.organizationId, range);
    expect(attendance).toEqual({ issued: 3, checkedIn: 1, cancelled: 1, attendanceRate: 0.3333 });
  });

  it("reports conversion as paid orders per view, and null with no views", async () => {
    const event = await makeEvent();
    await makePaidOrder({ eventId: event.id });

    let { traffic } = await getEventAnalytics(event.id, event.organizationId, range);
    expect(traffic).toEqual({ views: 0, paidOrders: 1, conversionRate: null });

    await prisma.event.update({ where: { id: event.id }, data: { viewCount: 4 } });
    ({ traffic } = await getEventAnalytics(event.id, event.organizationId, range));
    expect(traffic.conversionRate).toBe(0.25);
  });

  it("404s for an event in another organization", async () => {
    const event = await makeEvent();
    const { id: otherOrganizationId } = await makeOrganization();

    await expect(getEventAnalytics(event.id, otherOrganizationId, range)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("getDailySales", () => {
  it("buckets sales by Indian calendar day and returns plain numbers", async () => {
    const event = await makeEvent();
    await makePaidOrder({ eventId: event.id, paidAt: new Date("2026-09-10T06:00:00Z") });
    await makePaidOrder({ eventId: event.id, paidAt: new Date("2026-09-10T08:00:00Z") });
    // 20:00 UTC is 01:30 IST the next day.
    await makePaidOrder({ eventId: event.id, paidAt: new Date("2026-09-10T20:00:00Z") });
    // Outside the requested range.
    await makePaidOrder({ eventId: event.id, paidAt: new Date("2026-08-01T06:00:00Z") });

    const rows = await getDailySales(event.id, event.organizationId, {
      from: new Date("2026-09-01T00:00:00Z"),
      to: new Date("2026-09-30T00:00:00Z"),
    });

    expect(rows).toEqual([
      { day: "2026-09-10", orders: 2, tickets: 4, revenueMinor: 4000 },
      { day: "2026-09-11", orders: 1, tickets: 2, revenueMinor: 2000 },
    ]);
  });
});

describe("getOrganizationOverview", () => {
  it("returns per-event revenue and org totals, including events with no sales", async () => {
    const { id: organizationId } = await makeOrganization();
    const sold = await makeEvent({ organizationId, title: "Sold" });
    await makeEvent({ organizationId, title: "Quiet" });
    const { payment } = await makePaidOrder({ eventId: sold.id });
    await prisma.refund.create({
      data: { organizationId, paymentId: payment.id, amountMinor: 500, status: "APPROVED" },
    });

    const { totals, events } = await getOrganizationOverview(organizationId);

    expect(totals).toEqual({ grossMinor: 2000, refundedMinor: 500, netMinor: 1500, paidOrders: 1 });
    expect(events.find((e) => e.title === "Quiet")).toMatchObject({ grossMinor: 0, paidOrders: 0 });
  });
});

describe("event view counter", () => {
  it("counts detail views only, and keeps viewCount out of the public response", async () => {
    const event = await makeEvent();

    const viewed = await getPublishedEvent(event.id, { countView: true });
    await getPublishedEvent(event.id, { countView: true });
    await listPublicTicketTiers(event.id);

    const { viewCount } = await prisma.event.findUnique({ where: { id: event.id } });
    expect(viewCount).toBe(2);
    expect(viewed).not.toHaveProperty("viewCount");
  });

  it("doesn't count views of a draft event", async () => {
    const event = await makeEvent({ status: "DRAFT" });

    await expect(getPublishedEvent(event.id, { countView: true })).rejects.toMatchObject({
      statusCode: 404,
    });
    const { viewCount } = await prisma.event.findUnique({ where: { id: event.id } });
    expect(viewCount).toBe(0);
  });
});
