const { z } = require("zod");

const createRefundSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().min(1).optional(),
});

module.exports = { createRefundSchema };
