const { z } = require("zod");

const createOrderSchema = z.object({
  requestedItems: z
    .array(
      z.object({
        ticketTier: z.uuid({ message: "Invalid id" }),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "requestedItems must be a non-empty array"),
  idempotencyKey: z.string().min(1),
});

// Fields Razorpay Checkout.js hands to its success handler, forwarded by the frontend.
const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

module.exports = { createOrderSchema, verifyPaymentSchema };
