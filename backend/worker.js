// Background job process. Run alongside the API: `npm run worker`.
require("dotenv").config({ quiet: true });
const { Worker } = require("bullmq");
const redisConnection = require("./src/config/redis.js");
const prisma = require("./src/config/prisma.js");
const { TICKET_PDF_QUEUE } = require("./src/queues/ticketPdf.queue.js");
const { processTicketPdfJob } = require("./src/workers/ticketPdf.processor.js");

const worker = new Worker(TICKET_PDF_QUEUE, processTicketPdfJob, {
  connection: redisConnection,
  concurrency: 5,
});

worker.on("ready", () => console.log(`Worker listening on "${TICKET_PDF_QUEUE}"`));
worker.on("active", (job) => console.log(`[${job.id}] started (attempt ${job.attemptsMade + 1})`));
worker.on("completed", (job, result) =>
  console.log(`[${job.id}] completed:`, JSON.stringify(result)),
);
worker.on("failed", (job, error) =>
  console.error(`[${job?.id}] failed (attempt ${job?.attemptsMade}):`, error.message),
);
worker.on("error", (error) => console.error("Worker error:", error.message));

// worker.close() waits for in-flight jobs to finish, so a deploy doesn't cut a job in half.
const shutdown = async (signal) => {
  console.log(`${signal} received, closing worker`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
