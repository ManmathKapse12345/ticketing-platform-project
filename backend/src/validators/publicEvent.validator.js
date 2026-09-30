const { z } = require("zod");

const listPublishedEventsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: "from must be on or before to",
    path: ["to"],
  });

module.exports = { listPublishedEventsSchema };
