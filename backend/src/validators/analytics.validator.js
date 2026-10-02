const { z } = require("zod");

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;

// Date range for the daily-sales series. Defaults to the last 30 days.
const analyticsRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .transform(({ from, to }) => {
    const end = to ?? new Date();
    return { from: from ?? new Date(end.getTime() - DEFAULT_RANGE_DAYS * DAY_MS), to: end };
  })
  .refine((range) => range.from <= range.to, {
    message: "from must be on or before to",
    path: ["to"],
  })
  .refine((range) => range.to - range.from <= MAX_RANGE_DAYS * DAY_MS, {
    message: `Range can't exceed ${MAX_RANGE_DAYS} days`,
    path: ["from"],
  });

module.exports = { analyticsRangeSchema };
