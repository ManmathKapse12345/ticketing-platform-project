const { z } = require("zod");

const createEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    venue: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

const updateEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    venue: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "endDate must be on or after startDate",
      path: ["endDate"],
    },
  );

module.exports = { createEventSchema, updateEventSchema };
