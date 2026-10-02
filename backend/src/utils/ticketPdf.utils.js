const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const formatEventDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

// Collects pdfkit's output stream into one Buffer, so the same bytes can be
// saved to disk, attached to an email, or sent in an HTTP response.
const toBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

// order must include: event (with organization), user, and tickets (with ticketTier).
// One A5 page per ticket, each with its own signed QR code.
const renderTicketsPdf = async (order) => {
  const { event } = order;
  const doc = new PDFDocument({ size: "A5", margin: 36, autoFirstPage: false });
  const done = toBuffer(doc);

  const qrImages = await Promise.all(
    order.tickets.map((ticket) =>
      // QR value is the HMAC-signed payload the check-in endpoint verifies.
      QRCode.toBuffer(ticket.qrCode, { errorCorrectionLevel: "M", margin: 1, width: 400 }),
    ),
  );

  order.tickets.forEach((ticket, index) => {
    doc.addPage();
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(10).fillColor("#666").text(event.organization.name.toUpperCase());
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor("#000").text(event.title);
    doc.moveDown(0.5);
    doc.fontSize(11).text(formatEventDate(event.startDate));
    if (event.venue) doc.text(event.venue);
    doc.moveDown(0.8);

    doc.fontSize(12).text(ticket.ticketTier?.name ?? "Admission", { continued: true });
    doc.fillColor("#666").text(`   Ticket ${index + 1} of ${order.tickets.length}`);
    doc.fillColor("#000").fontSize(10).text(`Holder: ${order.user.name}`);
    doc.moveDown(0.8);

    const qrSize = 220;
    doc.image(qrImages[index], doc.page.margins.left + (width - qrSize) / 2, doc.y, {
      width: qrSize,
    });
    doc.y += qrSize + 12;

    doc.fontSize(8).fillColor("#666");
    doc.text(`Ticket ID: ${ticket.id}`, { align: "center" });
    doc.text(`Order ID: ${order.id}`, { align: "center" });
    doc.moveDown(0.5);
    doc.text("Show this QR code at the entrance. Each ticket can be scanned once.", {
      align: "center",
    });
  });

  doc.end();
  return done;
};

module.exports = { renderTicketsPdf, formatEventDate };
