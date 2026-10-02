const { z } = require("zod");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
};

const listOrganizationsSchema = z.object({
  ...pagination,
  verified: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

const listUsersSchema = z.object({
  ...pagination,
  role: z.enum(["customer", "platformAdmin"]).optional(),
});

const setVerificationSchema = z.object({ verified: z.boolean() });

const listPayoutsSchema = z.object({
  page: pagination.page,
  limit: pagination.limit,
  status: z.enum(["REQUESTED", "PAID", "CANCELLED"]).optional(),
});

// PAID needs the bank/UTR reference so the ledger can be reconciled.
const updatePayoutSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("PAID"),
    reference: z.string().trim().min(1).max(100),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    status: z.literal("CANCELLED"),
    note: z.string().trim().max(500).optional(),
  }),
]);

module.exports = {
  listOrganizationsSchema,
  listUsersSchema,
  setVerificationSchema,
  listPayoutsSchema,
  updatePayoutSchema,
};
