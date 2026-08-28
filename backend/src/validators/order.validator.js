const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z
  .string()
  .refine((val) => mongoose.isValidObjectId(val), { message: "Invalid id" });

const createOrderSchema = z.object({
  requestedItems: z
    .array(
      z.object({
        ticketTier: objectId,
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "requestedItems must be a non-empty array"),
  idempotencyKey: z.string().min(1),
});

module.exports = { createOrderSchema };
