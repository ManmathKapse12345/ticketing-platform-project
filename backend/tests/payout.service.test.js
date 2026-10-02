const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeOrganization, makeEvent, makePaidOrder } = require("./factories");
const {
  getPayoutBalance,
  requestPayout,
  updatePayoutStatus,
} = require("../src/services/payout.service.js");

beforeAll(() => dbHandler.connect());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

// A verified org with payout details, one finished event and one upcoming,
// each with a ₹20 (2000 paise) paid order.
const setup = async ({ verified = true } = {}) => {
  const org = await makeOrganization({
    verifiedAt: verified ? new Date() : null,
    payoutDetailsEncrypted: "iv.tag.ciphertext",
  });
  const owner = await makeUser();
  const past = await makeEvent({ organizationId: org.id, startDate: daysAgo(3), endDate: daysAgo(2) });
  const upcoming = await makeEvent({ organizationId: org.id });
  const { payment } = await makePaidOrder({ eventId: past.id });
  await makePaidOrder({ eventId: upcoming.id });
  return { org, owner, payment };
};

describe("getPayoutBalance", () => {
  it("counts only finished events, net of refunds", async () => {
    const { org, payment } = await setup();
    // Refund reserved but not yet confirmed still comes off the balance.
    await prisma.payment.update({ where: { id: payment.id }, data: { refundedMinor: 500 } });

    expect(await getPayoutBalance(org.id)).toEqual({
      settledMinor: 1500,
      reservedMinor: 0,
      availableMinor: 1500,
    });
  });
});

describe("requestPayout", () => {
  it("requests the full available balance, after which nothing is left", async () => {
    const { org, owner } = await setup();

    const payout = await requestPayout(org.id, owner.id);
    expect(payout).toMatchObject({ amountMinor: 2000, status: "REQUESTED" });

    await expect(requestPayout(org.id, owner.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("only one of two concurrent requests gets the money", async () => {
    const { org, owner } = await setup();

    const results = await Promise.allSettled([
      requestPayout(org.id, owner.id),
      requestPayout(org.id, owner.id),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const { _sum } = await prisma.payout.aggregate({ _sum: { amountMinor: true } });
    expect(_sum.amountMinor).toBe(2000);
  });

  it("refuses an unverified organization", async () => {
    const { org, owner } = await setup({ verified: false });
    await expect(requestPayout(org.id, owner.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("updatePayoutStatus", () => {
  it("cancelling releases the amount; a settled payout can't change again", async () => {
    const { org, owner } = await setup();
    const payout = await requestPayout(org.id, owner.id);

    await updatePayoutStatus(payout.id, { status: "CANCELLED", note: "wrong account" });
    expect((await getPayoutBalance(org.id)).availableMinor).toBe(2000);

    await expect(
      updatePayoutStatus(payout.id, { status: "PAID", reference: "UTR123" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("marks a payout PAID with its bank reference", async () => {
    const { org, owner } = await setup();
    const payout = await requestPayout(org.id, owner.id);

    const paid = await updatePayoutStatus(payout.id, { status: "PAID", reference: "UTR123" });

    expect(paid).toMatchObject({ status: "PAID", reference: "UTR123" });
    expect(paid.processedAt).toBeInstanceOf(Date);
    expect((await getPayoutBalance(org.id)).availableMinor).toBe(0);
  });
});
