const mockCreateRazorpayOrder = jest.fn();
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: mockCreateRazorpayOrder },
  })),
);

process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret";

const crypto = require("crypto");
const request = require("supertest");
const app = require("../app.js");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeTier } = require("./factories");
const { createOrder, createCheckout } = require("../src/services/order.service.js");

beforeAll(async () => {
  await dbHandler.connect();
});

beforeEach(() => {
  mockCreateRazorpayOrder.mockReset();
  mockCreateRazorpayOrder.mockImplementation(async () => ({ id: `order_${crypto.randomUUID()}` }));
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const makeCheckout = async () => {
  const tier = await makeTier();
  const { id: userId } = await makeUser();
  const order = await createOrder(
    userId,
    tier.organizationId,
    tier.eventId,
    [{ ticketTier: tier.id, quantity: 2 }],
    `idem-${crypto.randomUUID()}`,
  );
  const checkout = await createCheckout(order.id, userId);
  return { order, checkout };
};

// Sends the webhook exactly as Razorpay does: raw JSON body signed with the webhook secret.
const sendWebhook = (event, { eventId = `evt_${crypto.randomUUID()}`, secret } = {}) => {
  const body = JSON.stringify(event);
  const signature = crypto
    .createHmac("sha256", secret ?? process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return request(app)
    .post("/api/payments/webhook/razorpay")
    .set("Content-Type", "application/json")
    .set("X-Razorpay-Signature", signature)
    .set("X-Razorpay-Event-Id", eventId)
    .send(body);
};

const paymentEvent = (event, { razorpayOrderId, paymentId = "pay_webhook_1", amount }) => ({
  event,
  payload: { payment: { entity: { id: paymentId, order_id: razorpayOrderId, amount } } },
});

describe("POST /api/payments/webhook/razorpay", () => {
  it("payment.captured marks the order PAID and issues tickets", async () => {
    const { order, checkout } = await makeCheckout();

    const res = await sendWebhook(
      paymentEvent("payment.captured", {
        razorpayOrderId: checkout.razorpayOrderId,
        amount: checkout.amount,
      }),
    );

    expect(res.status).toBe(200);
    const paid = await prisma.order.findUnique({ where: { id: order.id } });
    expect(paid.paymentStatus).toBe("PAID");
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(2);
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment.gatewayPaymentId).toBe("pay_webhook_1");
  });

  it("rejects a request whose signature doesn't match", async () => {
    const { order, checkout } = await makeCheckout();

    const res = await sendWebhook(
      paymentEvent("payment.captured", {
        razorpayOrderId: checkout.razorpayOrderId,
        amount: checkout.amount,
      }),
      { secret: "attacker-guess" },
    );

    expect(res.status).toBe(400);
    const unchanged = await prisma.order.findUnique({ where: { id: order.id } });
    expect(unchanged.paymentStatus).toBe("PENDING");
  });

  it("does not issue tickets twice when Razorpay redelivers the same event", async () => {
    const { order, checkout } = await makeCheckout();
    const event = paymentEvent("payment.captured", {
      razorpayOrderId: checkout.razorpayOrderId,
      amount: checkout.amount,
    });

    await sendWebhook(event, { eventId: "evt_same" });
    await sendWebhook(event, { eventId: "evt_same" });

    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("refuses to fulfil when the captured amount differs from the order total", async () => {
    const { order, checkout } = await makeCheckout();

    const res = await sendWebhook(
      paymentEvent("payment.captured", {
        razorpayOrderId: checkout.razorpayOrderId,
        amount: 1, // tampered / wrong amount
      }),
    );

    expect(res.status).toBe(400);
    const unchanged = await prisma.order.findUnique({ where: { id: order.id } });
    expect(unchanged.paymentStatus).toBe("PENDING");
  });

  it("payment.failed marks the payment FAILED so the next checkout starts fresh", async () => {
    const { order, checkout } = await makeCheckout();

    const res = await sendWebhook(
      paymentEvent("payment.failed", { razorpayOrderId: checkout.razorpayOrderId }),
    );

    expect(res.status).toBe(200);
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment.status).toBe("FAILED");
  });

  it("acknowledges a captured payment for an order this app didn't create", async () => {
    const res = await sendWebhook(
      paymentEvent("payment.captured", { razorpayOrderId: "order_unknown", amount: 500 }),
    );

    expect(res.status).toBe(200);
  });
});
