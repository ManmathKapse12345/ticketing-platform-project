// Manually push a job onto the generate-ticket-pdf queue:
//   npm run queue:ticket-pdf -- <orderId>
// Without an orderId it uses the most recent PAID order.
require("dotenv").config({ quiet: true });
const prisma = require("../src/config/prisma.js");
const { enqueueTicketPdf, closeTicketPdfQueue } = require("../src/queues/ticketPdf.queue.js");

const main = async () => {
  let orderId = process.argv[2];
  if (!orderId) {
    const order = await prisma.order.findFirst({
      where: { paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
    });
    if (!order) throw new Error("No PAID order found; pass an orderId or run npm run seed:dev");
    orderId = order.id;
  }

  const job = await enqueueTicketPdf(orderId);
  console.log(`Enqueued job ${job.id} for order ${orderId}`);
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeTicketPdfQueue();
    await prisma.$disconnect();
  });
