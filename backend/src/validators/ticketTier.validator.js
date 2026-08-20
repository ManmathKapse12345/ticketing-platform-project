const { z } = require("zod");

const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

const createTicketTierSchema = z
  .object({
    name: z.string().min(1),
    price: z.string().regex(MONEY_REGEX, "price must be a decimal string like \"25.00\""),
    quantityTotal: z.number().int().min(1),
    salesStart: z.coerce.date().optional(),
    salesEnd: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.salesStart || !data.salesEnd || data.salesEnd >= data.salesStart,
    { message: "salesEnd must be on or after salesStart", path: ["salesEnd"] },
  );

const updateTicketTierSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.string().regex(MONEY_REGEX, "price must be a decimal string like \"25.00\"").optional(),
    quantityTotal: z.number().int().min(1).optional(),
    salesStart: z.coerce.date().optional(),
    salesEnd: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.salesStart || !data.salesEnd || data.salesEnd >= data.salesStart,
    { message: "salesEnd must be on or after salesStart", path: ["salesEnd"] },
  );

module.exports = { createTicketTierSchema, updateTicketTierSchema };
