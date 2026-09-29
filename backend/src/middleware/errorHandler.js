const ApiError = require('../utils/apiError.js');
const { Prisma } = require("@prisma/client");

// Safety net for Prisma errors a service didn't translate into an ApiError itself.
const PRISMA_ERRORS = {
  P2002: [409, "A resource with these values already exists"],
  P2003: [409, "This resource is still referenced by other records"],
  P2023: [400, "Invalid resource identifier"],
  P2025: [404, "Resource not found"],
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    const message = err.statusCode < 500 ? err.message : "Something went wrong";
    return res.status(err.statusCode).json({ success: false, message, requestId: req.id });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERRORS[err.code]) {
    const [statusCode, message] = PRISMA_ERRORS[err.code];
    return res.status(statusCode).json({ success: false, message, requestId: req.id });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : "Something went wrong";

  if (req.log) req.log.error({ err }, "Unhandled request error");

  return res.status(statusCode).json({ success: false, message, requestId: req.id });
};

module.exports = errorHandler;
