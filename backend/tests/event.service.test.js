const mockRefund = jest.fn();
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({ payments: { refund: mockRefund } })),
);

process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";

const crypto = require("crypto");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeEvent, makeTier, makeUser, makePaidOrder } = require("./factories");
const { cancelEvent } = require("../src/services/event.service.js");
const { createOrder } = require("../src/services/order.service.js");

beforeAll(() => dbHandler.connect());
beforeEach(() => {
  mockRefund.mockReset();
  mockRefund.mockImplementation(async () => ({ id: `rfnd_${crypto.randomUUID()}`, status: "processed" }));
});
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

describe("cancelEvent", () => {
  it("refunds paid orders, cancels unpaid ones, and voids every ticket", async () => {
    const event = await makeEvent();
    const paid = await makePaidOrder({ eventId: event.id });
    const tier = await makeTier({ eventId: event.id });
    const { id: userId } = await makeUser();
    const pending = await createOrder(userId, event.organizationId, event.id,
      [{ ticketTier: tier.id, quantity: 3 }], "idem-cancel");

    const { event: cancelled, refunds } = await cancelEvent(event.id, event.organizationId);

    expect(cancelled.status).toBe("CANCELLED");
    expect(refunds).toEqual({ requested: 1, failed: [] });
    expect((await prisma.order.findUnique({ where: { id: paid.order.id } })).paymentStatus).toBe("REFUNDED");
    expect((await prisma.order.findUnique({ where: { id: pending.id } })).paymentStatus).toBe("CANCELLED");
    expect(await prisma.ticket.count({ where: { eventId: event.id, status: "active" } })).toBe(0);
    expect((await prisma.ticketTier.findUnique({ where: { id: tier.id } })).quantitySold).toBe(0);
    expect((await prisma.ticketTier.findUnique({ where: { id: paid.tier.id } })).quantitySold).toBe(0);
  });

  it("keeps going when one refund fails, and a second cancel retries it", async () => {
    const event = await makeEvent();
    const first = await makePaidOrder({ eventId: event.id });
    const second = await makePaidOrder({ eventId: event.id });
    mockRefund.mockRejectedValueOnce(new Error("gateway down"));

    const { refunds } = await cancelEvent(event.id, event.organizationId);
    expect(refunds.requested).toBe(1);
    expect(refunds.failed).toHaveLength(1);

    const retry = await cancelEvent(event.id, event.organizationId);
    expect(retry.refunds).toEqual({ requested: 1, failed: [] });
    const statuses = await prisma.order.findMany({
      where: { id: { in: [first.order.id, second.order.id] } },
      select: { paymentStatus: true },
    });
    expect(statuses.every((o) => o.paymentStatus === "REFUNDED")).toBe(true);
  });
});
