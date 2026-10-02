const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({ createTransport: () => ({ sendMail: mockSendMail }) }));

const crypto = require("crypto");
const fs = require("fs/promises");
const request = require("supertest");
const app = require("../app.js");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeOrder, makePaidOrder, makeUser } = require("./factories");
const { processTicketPdfJob } = require("../src/workers/ticketPdf.processor.js");
const { pdfPathFor } = require("../src/services/ticketDelivery.service.js");
const { generateToken } = require("../src/utils/auth.utils.js");

beforeAll(() => dbHandler.connect());
beforeEach(() => mockSendMail.mockReset().mockResolvedValue({}));
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

// Stand-in for a BullMQ Job: the processor only uses data and updateProgress.
const fakeJob = (data) => ({ data, updateProgress: jest.fn() });
const isPdf = (buffer) => buffer.subarray(0, 5).toString() === "%PDF-";

describe("processTicketPdfJob", () => {
  it("saves a PDF and emails it to the buyer once", async () => {
    const { order } = await makePaidOrder();
    const job = fakeJob({ orderId: order.id });

    await expect(processTicketPdfJob(job)).resolves.toEqual({
      orderId: order.id,
      tickets: 2,
      emailed: true,
    });

    expect(isPdf(await fs.readFile(pdfPathFor(order.id)))).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [mail] = mockSendMail.mock.calls[0];
    const { email } = await prisma.user.findUnique({ where: { id: order.userId } });
    expect(mail.to).toBe(email);
    expect(mail.attachments[0].contentType).toBe("application/pdf");
    expect(isPdf(mail.attachments[0].content)).toBe(true);

    // A retry or re-enqueue regenerates the file but doesn't email again.
    await expect(processTicketPdfJob(job)).resolves.toMatchObject({ emailed: false });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("throws when the email fails so BullMQ retries, leaving the order undelivered", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP down"));
    const { order } = await makePaidOrder();

    await expect(processTicketPdfJob(fakeJob({ orderId: order.id }))).rejects.toThrow("SMTP down");

    const { ticketsEmailedAt } = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ticketsEmailedAt).toBeNull();
  });

  it("skips orders that aren't paid instead of failing", async () => {
    const order = await makeOrder();

    await expect(processTicketPdfJob(fakeJob({ orderId: order.id }))).resolves.toEqual({
      skipped: "order is PENDING",
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("skips a missing order, since retrying can't fix it", async () => {
    await expect(processTicketPdfJob(fakeJob({ orderId: crypto.randomUUID() }))).resolves.toEqual({
      skipped: "order not found",
    });
  });
});

describe("GET /api/orders/:orderId/tickets/pdf", () => {
  const authHeader = async (user) => `Bearer ${(await generateToken(user)).accessToken}`;

  it("lets the buyer download their tickets, rendering the PDF if it isn't saved yet", async () => {
    const { order } = await makePaidOrder();
    await fs.rm(pdfPathFor(order.id), { force: true });
    const buyer = await prisma.user.findUnique({ where: { id: order.userId } });

    const res = await request(app)
      .get(`/api/orders/${order.id}/tickets/pdf`)
      .set("Authorization", await authHeader(buyer))
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(isPdf(res.body)).toBe(true);
  });

  it("404s for someone else's order", async () => {
    const { order } = await makePaidOrder();
    const stranger = await makeUser();

    const res = await request(app)
      .get(`/api/orders/${order.id}/tickets/pdf`)
      .set("Authorization", await authHeader(stranger));

    expect(res.status).toBe(404);
  });
});
