const crypto = require("crypto");

const requestId = (req, res, next) => {
  const id = req.get("x-request-id") || crypto.randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
};

module.exports = requestId;
