const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");
const { sendEmail } = require("../utils/auth.utils.js");
const { renderTicketsPdf, formatEventDate } = require("../utils/ticketPdf.utils.js");

// Local disk for now. On hosts with ephemeral disks (Render, Railway) the file can
// vanish on redeploy, which is fine: getOrderTicketsPdf re-renders a missing file.
const PDF_DIR = process.env.TICKET_PDF_DIR || path.join(__dirname, "..", "..", "storage", "tickets");

const pdfPathFor = (orderId) => path.join(PDF_DIR, `${orderId}.pdf`);
const pdfFilenameFor = (orderId) => `tickets-${orderId.slice(0, 8)}.pdf`;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const loadOrderForTickets = (where) =>
  prisma.order.findFirst({
    where,
    include: {
      event: { include: { organization: { select: { name: true } } } },
      user: { select: { name: true, email: true } },
      tickets: {
        where: { status: { not: "cancelled" } },
        include: { ticketTier: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

const renderAndSave = async (order) => {
  const pdf = await renderTicketsPdf(order);
  await fs.mkdir(PDF_DIR, { recursive: true });
  await fs.writeFile(pdfPathFor(order.id), pdf);
  return pdf;
};

const ticketEmailHtml = (order) => `
  <p>Hi ${escapeHtml(order.user.name)},</p>
  <p>Your ${order.tickets.length} ticket(s) for <strong>${escapeHtml(order.event.title)}</strong> are attached.</p>
  <p>${escapeHtml(formatEventDate(order.event.startDate))}${
    order.event.venue ? ` &middot; ${escapeHtml(order.event.venue)}` : ""
  }</p>
  <p>Show the QR code on each ticket at the entrance. Each one can be scanned once.</p>
`;

// Worker step for one paid order: render + save the PDF, then email it once.
// Throws on email failure so BullMQ retries with backoff; ticketsEmailedAt
// stops a retry (or a re-enqueue) from emailing the customer twice.
const deliverOrderTickets = async (orderId) => {
  const order = await loadOrderForTickets({ id: orderId });
  if (!order) return { skipped: "order not found" };
  if (order.paymentStatus !== "PAID") return { skipped: `order is ${order.paymentStatus}` };
  if (order.tickets.length === 0) return { skipped: "order has no active tickets" };

  const pdf = await renderAndSave(order);

  if (order.ticketsEmailedAt) {
    return { orderId, tickets: order.tickets.length, emailed: false, reason: "already emailed" };
  }

  await sendEmail(
    order.user.email,
    `Your tickets for ${order.event.title}`,
    ticketEmailHtml(order),
    [{ filename: pdfFilenameFor(order.id), content: pdf, contentType: "application/pdf" }],
  );
  await prisma.order.updateMany({
    where: { id: orderId, ticketsEmailedAt: null },
    data: { ticketsEmailedAt: new Date() },
  });

  return { orderId, tickets: order.tickets.length, emailed: true };
};

// Download for the ticket owner. Serves the saved file, or renders it if the
// worker hasn't run yet or the disk was wiped.
const getOrderTicketsPdf = async (orderId, userId) => {
  const order = await loadOrderForTickets({ id: orderId, userId });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentStatus !== "PAID") {
    throw new ApiError(409, `Order is ${order.paymentStatus.toLowerCase()}, no tickets to download`);
  }
  if (order.tickets.length === 0) throw new ApiError(404, "Order has no active tickets");

  let pdf;
  try {
    pdf = await fs.readFile(pdfPathFor(order.id));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    pdf = await renderAndSave(order);
  }
  return { pdf, filename: pdfFilenameFor(order.id) };
};

module.exports = { deliverOrderTickets, getOrderTicketsPdf, pdfPathFor };
