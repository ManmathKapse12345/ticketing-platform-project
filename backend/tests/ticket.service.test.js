const mongoose = require("mongoose");
const dbHandler = require("./dbHandler");
const Ticket = require("../src/models/0007_ticket.model.js");
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

const makeTicket = (overrides = {}) =>
  Ticket.create({
    orderId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    organizationId: new mongoose.Types.ObjectId(),
    ownerUserId: new mongoose.Types.ObjectId(),
    qrCode: `qr-${Math.random()}`,
    ...overrides,
  });

describe("getSpecificTicket", () => {
  it("returns the ticket when the requester owns it", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ticket = await makeTicket({ ownerUserId: ownerId });

    const result = await getSpecificTicket(ticket._id, ownerId);
    expect(result._id.toString()).toBe(ticket._id.toString());
  });

  it("throws 404 when a different user requests someone else's ticket", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const strangerId = new mongoose.Types.ObjectId();
    const ticket = await makeTicket({ ownerUserId: ownerId });

    await expect(getSpecificTicket(ticket._id, strangerId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("getAllTicket", () => {
  it("only returns tickets owned by the requesting user", async () => {
    const userId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();
    await makeTicket({ ownerUserId: userId });
    await makeTicket({ ownerUserId: userId });
    await makeTicket({ ownerUserId: otherId });

    const tickets = await getAllTicket(userId);
    expect(tickets).toHaveLength(2);
    tickets.forEach((t) => expect(t.ownerUserId.toString()).toBe(userId.toString()));
  });
});
