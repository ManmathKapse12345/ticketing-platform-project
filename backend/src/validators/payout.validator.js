const { z } = require("zod");

// Stored encrypted (payout.service.js), so it's validated here and never echoed back.
const payoutDetailsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("bank"),
    accountHolderName: z.string().trim().min(2).max(100),
    accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Account number must be 9-18 digits"),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  }),
  z.object({
    method: z.literal("upi"),
    upiId: z.string().trim().regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID"),
  }),
]);

module.exports = { payoutDetailsSchema };
