const mockCreateRazorpayOrder = jest.fn();
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: mockCreateRazorpayOrder },
  })),
);

process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";

const crypto = require("crypto");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeTier } = require("./factories");
const {
  createOrder,
  createCheckout,
  verifyCheckoutPayment,
} = require("../src/services/order.service.js");

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

const findTier = (id) => prisma.ticketTier.findUnique({ where: { id } });

describe("createOrder", () => {
  it("reserves inventory and creates an order", async () => {
    const tier = await makeTier();
    const { id: userId } = await makeUser();

    const order = await createOrder(
      userId,
      tier.organizationId,
      tier.eventId,
      [{ ticketTier: tier.id, quantity: 2 }],
      "idem-1",
    );

    expect(order.totalAmountMinor).toBe(2000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ ticketTierId: tier.id, quantity: 2 });
    const updatedTier = await findTier(tier.id);
    expect(updatedTier.quantitySold).toBe(2);
  });

  it("returns the existing order for a repeated idempotencyKey without reserving twice", async () => {
    const tier = await makeTier();
    const { id: userId } = await makeUser();
    const items = [{ ticketTier: tier.id, quantity: 2 }];

    const first = await createOrder(userId, tier.organizationId, tier.eventId, items, "idem-2");
    const second = await createOrder(userId, tier.organizationId, tier.eventId, items, "idem-2");

    expect(second.id).toBe(first.id);
    const updatedTier = await findTier(tier.id);
    expect(updatedTier.quantitySold).toBe(2); // not 4 — second call must not re-reserve
  });

  it("rolls back inventory already reserved earlier in the same request when a later item is sold out", async () => {
    const roomyTier = await makeTier({ name: "Roomy", quantityTotal: 10, quantitySold: 0 });
    const soldOutTier = await makeTier({
      eventId: roomyTier.eventId,
      name: "SoldOut",
      quantityTotal: 5,
      quantitySold: 5,
    });
    const { id: userId } = await makeUser();

    await expect(
      createOrder(
        userId,
        roomyTier.organizationId,
        roomyTier.eventId,
        [
          { ticketTier: roomyTier.id, quantity: 3 },
          { ticketTier: soldOutTier.id, quantity: 1 },
        ],
        "idem-3",
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    const updatedRoomy = await findTier(roomyTier.id);
    expect(updatedRoomy.quantitySold).toBe(0); // released, not leaked
    const orders = await prisma.order.findMany({ where: { userId } });
    expect(orders).toHaveLength(0);
  });

  it("never sells more seats than exist when buyers race for the last ones", async () => {
    const tier = await makeTier({ quantityTotal: 3 });
    const buyers = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);

    const results = await Promise.allSettled(
      buyers.map((buyer, i) =>
        createOrder(
          buyer.id,
          tier.organizationId,
          tier.eventId,
          [{ ticketTier: tier.id, quantity: 1 }],
          `idem-seat-${i}`,
        ),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ statusCode: 409 });
    const updatedTier = await findTier(tier.id);
    expect(updatedTier.quantitySold).toBe(3);
  });

  it("handles a concurrent duplicate-idempotencyKey race without double-reserving or crashing", async () => {
    const tier = await makeTier({ quantityTotal: 10 });
    const { id: userId } = await makeUser();
    const items = [{ ticketTier: tier.id, quantity: 2 }];

    const [orderA, orderB] = await Promise.all([
      createOrder(userId, tier.organizationId, tier.eventId, items, "idem-race"),
      createOrder(userId, tier.organizationId, tier.eventId, items, "idem-race"),
    ]);

    expect(orderA.id).toBe(orderB.id);
    const orders = await prisma.order.findMany({ where: { userId, idempotencyKey: "idem-race" } });
    expect(orders).toHaveLength(1);
    const updatedTier = await findTier(tier.id);
    expect(updatedTier.quantitySold).toBe(2); // one reservation survives, the loser's was rolled back
  });
});

const signCheckout = (razorpayOrderId, razorpayPaymentId) =>
  crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

const makePendingOrder = async (quantity = 1) => {
  const tier = await makeTier();
  const { id: userId } = await makeUser();
  const order = await createOrder(
    userId,
    tier.organizationId,
    tier.eventId,
    [{ ticketTier: tier.id, quantity }],
    `idem-${crypto.randomUUID()}`,
  );
  return { order, userId };
};

describe("createCheckout", () => {
  it("creates a Razorpay order in INR and stores the Payment record", async () => {
    const { order, userId } = await makePendingOrder();

    const checkout = await createCheckout(order.id, userId);

    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, currency: "INR", receipt: order.id }),
    );
    expect(checkout).toMatchObject({ keyId: "rzp_test_key", amount: 1000, currency: "INR" });
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment).toMatchObject({
      gateway: "RAZORPAY",
      gatewayOrderId: checkout.razorpayOrderId,
      status: "PENDING",
    });
  });

  it("reuses the same Razorpay order on a second call instead of creating a duplicate", async () => {
    const { order, userId } = await makePendingOrder();

    const first = await createCheckout(order.id, userId);
    const second = await createCheckout(order.id, userId);

    expect(second.razorpayOrderId).toBe(first.razorpayOrderId);
    expect(mockCreateRazorpayOrder).toHaveBeenCalledTimes(1);
    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments).toHaveLength(1);
  });

  it("creates a fresh Razorpay order after the previous attempt failed", async () => {
    const { order, userId } = await makePendingOrder();
    const first = await createCheckout(order.id, userId);
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: "FAILED" } });

    const second = await createCheckout(order.id, userId);

    expect(second.razorpayOrderId).not.toBe(first.razorpayOrderId);
  });
});

describe("verifyCheckoutPayment", () => {
  it("marks the order PAID and issues one ticket per seat when the signature is valid", async () => {
    const { order, userId } = await makePendingOrder(2);
    const { razorpayOrderId } = await createCheckout(order.id, userId);

    const paid = await verifyCheckoutPayment(order.id, userId, {
      razorpayOrderId,
      razorpayPaymentId: "pay_test_1",
      razorpaySignature: signCheckout(razorpayOrderId, "pay_test_1"),
    });

    expect(paid.paymentStatus).toBe("PAID");
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment).toMatchObject({ status: "SUCCESS", gatewayPaymentId: "pay_test_1" });
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("rejects a forged signature and leaves the order unpaid", async () => {
    const { order, userId } = await makePendingOrder();
    const { razorpayOrderId } = await createCheckout(order.id, userId);

    await expect(
      verifyCheckoutPayment(order.id, userId, {
        razorpayOrderId,
        razorpayPaymentId: "pay_test_2",
        razorpaySignature: "0".repeat(64),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    const unchanged = await prisma.order.findUnique({ where: { id: order.id } });
    expect(unchanged.paymentStatus).toBe("PENDING");
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("issues tickets only once when verify is called twice", async () => {
    const { order, userId } = await makePendingOrder();
    const { razorpayOrderId } = await createCheckout(order.id, userId);
    const body = {
      razorpayOrderId,
      razorpayPaymentId: "pay_test_3",
      razorpaySignature: signCheckout(razorpayOrderId, "pay_test_3"),
    };

    await verifyCheckoutPayment(order.id, userId, body);
    await verifyCheckoutPayment(order.id, userId, body);

    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("refuses to verify a payment for someone else's order", async () => {
    const { order, userId } = await makePendingOrder();
    const { razorpayOrderId } = await createCheckout(order.id, userId);
    const { id: strangerId } = await makeUser();

    await expect(
      verifyCheckoutPayment(order.id, strangerId, {
        razorpayOrderId,
        razorpayPaymentId: "pay_test_4",
        razorpaySignature: signCheckout(razorpayOrderId, "pay_test_4"),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
