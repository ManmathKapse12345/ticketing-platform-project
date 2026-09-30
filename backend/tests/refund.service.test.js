const mockRefund = jest.fn();
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({ payments: { refund: mockRefund } })),
);

process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";

const crypto = require("crypto");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makePaidOrder } = require("./factories");
const {
  createRefund,
  handleRefundProcessed,
  handleRefundFailed,
} = require("../src/services/refund.service.js");

beforeAll(() => dbHandler.connect());
beforeEach(() => {
  mockRefund.mockReset();
  mockRefund.mockImplementation(async () => ({ id: `rfnd_${crypto.randomUUID()}`, status: "processed" }));
});
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());



const state = async ({ order, tier, payment }) => ({
  order: await prisma.order.findUnique({ where: { id: order.id } }),
  tier: await prisma.ticketTier.findUnique({ where: { id: tier.id } }),
  payment: await prisma.payment.findUnique({ where: { id: payment.id } }),
  activeTickets: await prisma.ticket.count({ where: { orderId: order.id, status: "active" } }),
});

describe("createRefund", () => {
  it("allows a second refund after a partial one, and only the full refund cancels tickets and frees seats", async () => {
    const paid = await makePaidOrder();

    await createRefund(paid.tier.organizationId, paid.order.id, 500, "goodwill");
    let s = await state(paid);
    expect(s.order.paymentStatus).toBe("PAID");
    expect(s.payment.refundedMinor).toBe(500);
    expect(s.activeTickets).toBe(2);

    await createRefund(paid.tier.organizationId, paid.order.id); // remaining 1500
    expect(mockRefund).toHaveBeenLastCalledWith(paid.payment.gatewayPaymentId, expect.objectContaining({ amount: 1500 }));
    s = await state(paid);
    expect(s.order.paymentStatus).toBe("REFUNDED");
    expect(s.payment.status).toBe("REFUNDED");
    expect(s.activeTickets).toBe(0);
    expect(s.tier.quantitySold).toBe(0);
  });

  it("rejects a refund larger than what's left", async () => {
    const paid = await makePaidOrder();
    await createRefund(paid.tier.organizationId, paid.order.id, 1500);

    await expect(createRefund(paid.tier.organizationId, paid.order.id, 600))
      .rejects.toMatchObject({ statusCode: 409 });
    expect((await state(paid)).payment.refundedMinor).toBe(1500);
  });

  it("releases the reservation when Razorpay rejects the refund", async () => {
    const paid = await makePaidOrder();
    mockRefund.mockRejectedValueOnce(new Error("gateway down"));

    await expect(createRefund(paid.tier.organizationId, paid.order.id))
      .rejects.toMatchObject({ statusCode: 502 });
    expect((await state(paid)).payment.refundedMinor).toBe(0);
    expect(await prisma.refund.findFirst()).toMatchObject({ status: "REJECTED" });
  });
});

describe("refund webhooks", () => {
  it("finishes a pending refund on refund.processed, and a redelivery doesn't free seats twice", async () => {
    const paid = await makePaidOrder();
    mockRefund.mockResolvedValueOnce({ id: "rfnd_pending", status: "pending" });
    const refund = await createRefund(paid.tier.organizationId, paid.order.id);
    expect(refund.status).toBe("PENDING");

    const entity = { id: "rfnd_pending", notes: { refundId: refund.id } };
    await handleRefundProcessed(entity);
    await handleRefundProcessed(entity);

    const s = await state(paid);
    expect(s.order.paymentStatus).toBe("REFUNDED");
    expect(s.tier.quantitySold).toBe(0);
  });

  it("releases the reserved amount on refund.failed so the refund can be retried", async () => {
    const paid = await makePaidOrder();
    mockRefund.mockResolvedValueOnce({ id: "rfnd_fail", status: "pending" });
    const refund = await createRefund(paid.tier.organizationId, paid.order.id);

    await handleRefundFailed({ id: "rfnd_fail", notes: { refundId: refund.id } });

    const s = await state(paid);
    expect(s.payment.refundedMinor).toBe(0);
    expect(s.order.paymentStatus).toBe("PAID");
    await expect(createRefund(paid.tier.organizationId, paid.order.id)).resolves.toMatchObject({ status: "APPROVED" });
  });
});
