const app = require("./app.js");
const connectDB = require("./src/config/db.js");
const prisma = require("./src/config/prisma.js");
const {
  sweepExpiredOrders,
  requeueUndeliveredTickets,
} = require("./src/services/order.service.js");
const { closeTicketPdfQueue } = require("./src/queues/ticketPdf.queue.js");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT,() => {
    console.log(`Server running on  http://localhost:${PORT}`);
  });

  const sweeper = setInterval(() => {
    sweepExpiredOrders().catch((err) => console.error("sweepExpiredOrders failed:", err));
  }, 60 * 1000);

  const ticketRequeuer = setInterval(() => {
    requeueUndeliveredTickets().catch((err) =>
      console.error("requeueUndeliveredTickets failed:", err.message),
    );
  }, 5 * 60 * 1000);

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    clearInterval(sweeper);
    clearInterval(ticketRequeuer);
    server.close(async () => {
      await closeTicketPdfQueue();
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}).catch((error) => {
  console.error("PostgreSQL connection error :- ",error);
});
