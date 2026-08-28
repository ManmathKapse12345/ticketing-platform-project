jest.mock("stripe", () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_123_secret_abc",
      }),
      retrieve: jest.fn().mockResolvedValue({
        client_secret: "pi_test_123_secret_abc",
      }),
    },
  }));
});

const mongoose = require("mongoose");
const dbHandler = require("./dbHandler");
const TicketTier = require("../src/models/0005_ticketTier.model.js");
const Order = require("../src/models/0006_order.model.js");
const Payment = require("../src/models/0008_payment.model.js");
const { createOrder, paymentIntent } = require("../src/services/order.service.js");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const makeTier = (overrides = {}) =>
  TicketTier.create({
    eventId: new mongoose.Types.ObjectId(),
    organizationId: new mongoose.Types.ObjectId(),
    name: "General",
    priceMinor: 1000,
    quantityTotal: 10,
    quantitySold: 0,
    ...overrides,
  });

describe("createOrder", () => {
  it("reserves inventory and creates an order", async () => {
    const tier = await makeTier();
    const userId = new mongoose.Types.ObjectId();

    const order = await createOrder(
      userId,
      tier.organizationId,
      tier.eventId,
      [{ ticketTier: tier._id, quantity: 2 }],
      "idem-1",
    );

    expect(order.totalAmountMinor).toBe(2000);
    const updatedTier = await TicketTier.findById(tier._id);
    expect(updatedTier.quantitySold).toBe(2);
  });

  it("returns the existing order for a repeated idempotencyKey without reserving twice", async () => {
    const tier = await makeTier();
    const userId = new mongoose.Types.ObjectId();
    const items = [{ ticketTier: tier._id, quantity: 2 }];

    const first = await createOrder(userId, tier.organizationId, tier.eventId, items, "idem-2");
    const second = await createOrder(userId, tier.organizationId, tier.eventId, items, "idem-2");

    expect(second._id.toString()).toBe(first._id.toString());
    const updatedTier = await TicketTier.findById(tier._id);
    expect(updatedTier.quantitySold).toBe(2); // not 4 — second call must not re-reserve
  });

  it("rolls back inventory already reserved earlier in the same request when a later item is sold out", async () => {
    const roomyTier = await makeTier({ name: "Roomy", quantityTotal: 10, quantitySold: 0 });
    const soldOutTier = await makeTier({
      eventId: roomyTier.eventId,
      organizationId: roomyTier.organizationId,
      name: "SoldOut",
      quantityTotal: 5,
      quantitySold: 5,
    });
    const userId = new mongoose.Types.ObjectId();

    await expect(
      createOrder(
        userId,
        roomyTier.organizationId,
        roomyTier.eventId,
        [
          { ticketTier: roomyTier._id, quantity: 3 },
          { ticketTier: soldOutTier._id, quantity: 1 },
        ],
        "idem-3",
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    const updatedRoomy = await TicketTier.findById(roomyTier._id);
    expect(updatedRoomy.quantitySold).toBe(0); // released, not leaked
    const orders = await Order.find({ userId });
    expect(orders).toHaveLength(0);
  });

  it("handles a concurrent duplicate-idempotencyKey race without double-reserving or crashing", async () => {
    const tier = await makeTier({ quantityTotal: 10 });
    const userId = new mongoose.Types.ObjectId();
    const items = [{ ticketTier: tier._id, quantity: 2 }];

    const [orderA, orderB] = await Promise.all([
      createOrder(userId, tier.organizationId, tier.eventId, items, "idem-race"),
      createOrder(userId, tier.organizationId, tier.eventId, items, "idem-race"),
    ]);

    expect(orderA._id.toString()).toBe(orderB._id.toString());
    const orders = await Order.find({ userId, idempotencyKey: "idem-race" });
    expect(orders).toHaveLength(1);
    const updatedTier = await TicketTier.findById(tier._id);
    expect(updatedTier.quantitySold).toBe(2); // one reservation survives, the loser's was released
  });
});

describe("paymentIntent", () => {
  it("creates a new Stripe payment intent and stores the Payment record", async () => {
    const tier = await makeTier();
    const userId = new mongoose.Types.ObjectId();
    const order = await createOrder(
      userId,
      tier.organizationId,
      tier.eventId,
      [{ ticketTier: tier._id, quantity: 1 }],
      "idem-pay-1",
    );

    const clientSecret = await paymentIntent(order._id, userId);

    expect(clientSecret).toBe("pi_test_123_secret_abc");
    const payment = await Payment.findOne({ orderId: order._id });
    expect(payment.paymentIntentId).toBe("pi_test_123");
    expect(payment.status).toBe("PENDING");
  });

  it("returns the same client secret on a second call instead of creating a duplicate Payment", async () => {
    const tier = await makeTier();
    const userId = new mongoose.Types.ObjectId();
    const order = await createOrder(
      userId,
      tier.organizationId,
      tier.eventId,
      [{ ticketTier: tier._id, quantity: 1 }],
      "idem-pay-2",
    );

    const first = await paymentIntent(order._id, userId);
    const second = await paymentIntent(order._id, userId);

    expect(second).toBe(first);
    const payments = await Payment.find({ orderId: order._id });
    expect(payments).toHaveLength(1);
  });
});
