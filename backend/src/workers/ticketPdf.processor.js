const { deliverOrderTickets } = require("../services/ticketDelivery.service.js");

// Kept separate from the Worker so it can be tested without Redis.
// Throwing makes BullMQ retry the job (attempts/backoff on the queue).
const processTicketPdfJob = async (job) => {
  const result = await deliverOrderTickets(job.data.orderId);
  await job.updateProgress(100);
  return result;
};

module.exports = { processTicketPdfJob };
