const dbHandler = require("./dbHandler");
const WebhookEvent = require("../src/models/0013_webhookEvent.model.js");
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

describe("processWebhookOnce", () => {
  it("processes a new event and marks it PROCESSED", async () => {
    const handler = jest.fn().mockResolvedValue();

    const result = await processWebhookOnce("STRIPE", "evt_1", "payment_intent.succeeded", handler);

    expect(result).toEqual({ duplicate: false });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = await WebhookEvent.findOne({ providerEventId: "evt_1" });
    expect(event.status).toBe("PROCESSED");
  });

  it("skips a second delivery of an already-processed event", async () => {
    const handler = jest.fn().mockResolvedValue();

    await processWebhookOnce("STRIPE", "evt_2", "payment_intent.succeeded", handler);
    const result = await processWebhookOnce("STRIPE", "evt_2", "payment_intent.succeeded", handler);

    expect(result).toEqual({ duplicate: true });
    expect(handler).toHaveBeenCalledTimes(1); // not called again
  });

  it("retries an event whose handler previously failed instead of treating it as a duplicate", async () => {
    const failingHandler = jest.fn().mockRejectedValue(new Error("transient DB error"));

    await expect(
      processWebhookOnce("STRIPE", "evt_3", "payment_intent.succeeded", failingHandler),
    ).rejects.toThrow("transient DB error");

    const failedEvent = await WebhookEvent.findOne({ providerEventId: "evt_3" });
    expect(failedEvent.status).toBe("FAILED");

    const succeedingHandler = jest.fn().mockResolvedValue();
    const result = await processWebhookOnce(
      "STRIPE",
      "evt_3",
      "payment_intent.succeeded",
      succeedingHandler,
    );

    expect(result).toEqual({ duplicate: false });
    expect(succeedingHandler).toHaveBeenCalledTimes(1);
    const finalEvent = await WebhookEvent.findOne({ providerEventId: "evt_3" });
    expect(finalEvent.status).toBe("PROCESSED");
  });
});
