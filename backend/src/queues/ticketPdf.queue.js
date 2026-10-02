const { Queue } = require("bullmq");
const redisConnection = require("../config/redis.js");

const TICKET_PDF_QUEUE = "generate-ticket-pdf";

// JOB_QUEUE_DISABLED=true skips enqueueing: set by the test setup, and handy for
// running the API without Redis. Paid orders are still picked up later by
// requeueUndeliveredTickets once the queue is back on.
const isQueueDisabled = () => process.env.JOB_QUEUE_DISABLED === "true";

// Created on first use, so requiring this module doesn't open a Redis connection.
let queue;
const getTicketPdfQueue = () => {
  queue ??= new Queue(TICKET_PDF_QUEUE, {
    // The API side fails fast when Redis is down instead of buffering the add
    // forever, so a payment request never hangs on the queue.
    connection: { ...redisConnection, enableOfflineQueue: false },
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 10_000 }, // 10s, 20s, 40s, 80s
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 }, // keep failures a week for debugging
    },
  });
  // Without a listener, connection errors are thrown as unhandled 'error' events.
  queue.on("error", (error) => console.error("Ticket PDF queue error:", error.message));
  return queue;
};

// jobId = orderId: BullMQ ignores an add whose id already exists, so the
// webhook, verify-payment and the requeue sweep can all enqueue safely.
const enqueueTicketPdf = (orderId) => {
  if (isQueueDisabled()) return null;
  return getTicketPdfQueue().add("order-tickets", { orderId }, { jobId: orderId });
};

const closeTicketPdfQueue = async () => {
  if (queue) await queue.close();
  queue = undefined;
};

module.exports = { TICKET_PDF_QUEUE, getTicketPdfQueue, enqueueTicketPdf, closeTicketPdfQueue };
