const prisma = require("../config/prisma.js");
const { isUniqueViolation } = require("../utils/prisma.utils.js");

// Flip a FAILED event back to PROCESSING so this delivery can retry it. The status
// check in the filter makes it an atomic claim: only one concurrent retry wins.
const claimFailedEvent = async (id) => {
  const { count } = await prisma.webhookEvent.updateMany({
    where: { id, status: "FAILED" },
    data: { status: "PROCESSING" },
  });
  return count === 1;
};

const processWebhookOnce = async (
  gateway,
  providerEventId,
  eventType,
  handler,
) => {
  const findEvent = () =>
    prisma.webhookEvent.findUnique({
      where: { gateway_providerEventId: { gateway, providerEventId } },
    });

  let event;
  try {
    const eventExists = await findEvent();
    if (eventExists) {
      // A previous delivery of this event failed — let the gateway's retry reprocess it
      // instead of treating it as an already-handled duplicate.
      if (eventExists.status !== "FAILED") return { duplicate: true };
      if (!(await claimFailedEvent(eventExists.id))) return { duplicate: true };
      event = eventExists;
    } else {
      event = await prisma.webhookEvent.create({
        data: { gateway, providerEventId, eventType },
      });
    }
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // A concurrent delivery of the same event inserted it first.
    const existing = await findEvent();
    if (!existing || existing.status !== "FAILED") {
      return { duplicate: true };
    }
    if (!(await claimFailedEvent(existing.id))) return { duplicate: true };
    event = existing;
  }

  try {
    await handler();
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { duplicate: false };
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
};

module.exports = { processWebhookOnce };
