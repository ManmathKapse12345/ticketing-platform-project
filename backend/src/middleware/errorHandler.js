const ApiError = require('../utils/apiError.js');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (err.name === "ValidationError" ? 400 : 500);
  const message =
    err.name === "ValidationError"
      ? Object.values(err.errors).map((error) => error.message).join(", ")
      : err.name === "CastError"
        ? "Invalid resource identifier"
        : statusCode < 500
          ? err.message
          : "Something went wrong";

  if (err instanceof ApiError) {
    return res.status(statusCode).json({ success: false, message, requestId: req.id });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A resource with these values already exists",
      requestId: req.id,
    });
  }

  if (req.log) req.log.error({ err }, "Unhandled request error");

  return res.status(statusCode).json({ success: false, message, requestId: req.id });
};

module.exports = errorHandler;