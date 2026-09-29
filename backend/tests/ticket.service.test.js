const crypto = require("crypto");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeOrder } = require("./factories");
const { getSpecificTicket, getAllTicket } = require("../src/services/ticket.service.js");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const makeTicket = async ({ ownerUserId }) => {
  const order = await makeOrder({ userId: ownerUserId });
  return prisma.ticket.create({
    data: {
      orderId: order.id,
      eventId: order.eventId,
      organizationId: order.organizationId,
      ownerUserId,
      qrCode: `qr-${crypto.randomUUID()}`,
    },
  });
};

describe("getSpecificTicket", () => {
  it("returns the ticket when the requester owns it", async () => {
    const { id: ownerId } = await makeUser();
    const ticket = await makeTicket({ ownerUserId: ownerId });

    const result = await getSpecificTicket(ticket.id, ownerId);
    expect(result.id).toBe(ticket.id);
  });

  it("throws 404 when a different user requests someone else's ticket", async () => {
    const { id: ownerId } = await makeUser();
    const { id: strangerId } = await makeUser();
    const ticket = await makeTicket({ ownerUserId: ownerId });

    await expect(getSpecificTicket(ticket.id, strangerId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("getAllTicket", () => {
  it("only returns tickets owned by the requesting user", async () => {
    const { id: userId } = await makeUser();
    const { id: otherId } = await makeUser();
    await makeTicket({ ownerUserId: userId });
    await makeTicket({ ownerUserId: userId });
    await makeTicket({ ownerUserId: otherId });

    const tickets = await getAllTicket(userId);
    expect(tickets).toHaveLength(2);
    tickets.forEach((t) => expect(t.ownerUserId).toBe(userId));
  });
});
