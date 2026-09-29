const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { processWebhookOnce } = require("../src/services/webhook.service.js");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const findEvent = (providerEventId) =>
  prisma.webhookEvent.findFirst({ where: { providerEventId } });

describe("processWebhookOnce", () => {
  it("processes a new event and marks it PROCESSED", async () => {
    const handler = jest.fn().mockResolvedValue();

    const result = await processWebhookOnce("RAZORPAY", "evt_1", "payment.captured", handler);

    expect(result).toEqual({ duplicate: false });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = await findEvent("evt_1");
    expect(event.status).toBe("PROCESSED");
  });

  it("skips a second delivery of an already-processed event", async () => {
    const handler = jest.fn().mockResolvedValue();

    await processWebhookOnce("RAZORPAY", "evt_2", "payment.captured", handler);
    const result = await processWebhookOnce("RAZORPAY", "evt_2", "payment.captured", handler);

    expect(result).toEqual({ duplicate: true });
    expect(handler).toHaveBeenCalledTimes(1); // not called again
  });

  it("processes concurrent deliveries of the same event only once", async () => {
    const handler = jest.fn().mockResolvedValue();

    const results = await Promise.all([
      processWebhookOnce("RAZORPAY", "evt_4", "payment.captured", handler),
      processWebhookOnce("RAZORPAY", "evt_4", "payment.captured", handler),
    ]);

    expect(results.filter((r) => r.duplicate === false)).toHaveLength(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("retries an event whose handler previously failed instead of treating it as a duplicate", async () => {
    const failingHandler = jest.fn().mockRejectedValue(new Error("transient DB error"));

    await expect(
      processWebhookOnce("RAZORPAY", "evt_3", "payment.captured", failingHandler),
    ).rejects.toThrow("transient DB error");

    const failedEvent = await findEvent("evt_3");
    expect(failedEvent.status).toBe("FAILED");

    const succeedingHandler = jest.fn().mockResolvedValue();
    const result = await processWebhookOnce(
      "RAZORPAY",
      "evt_3",
      "payment.captured",
      succeedingHandler,
    );

    expect(result).toEqual({ duplicate: false });
    expect(succeedingHandler).toHaveBeenCalledTimes(1);
    const finalEvent = await findEvent("evt_3");
    expect(finalEvent.status).toBe("PROCESSED");
  });
});
