const { z } = require("zod");

const checkInTicketSchema = z.object({
  qrCode: z.string().min(1),
});

module.exports = { checkInTicketSchema };
