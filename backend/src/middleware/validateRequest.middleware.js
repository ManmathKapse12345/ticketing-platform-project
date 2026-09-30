// Validates req.body / req.params against Zod schemas: validateRequest({ body, params }).
// req.body is replaced with the parsed (trimmed, lowercased) values.
const validateRequest = (schemas) => (req, res, next) => {
  for (const [source, schema] of Object.entries(schemas)) {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    if (source === "body") req.body = parsed.data;
  }
  next();
};

module.exports = validateRequest;
