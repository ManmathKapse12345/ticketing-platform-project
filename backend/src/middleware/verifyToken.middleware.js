const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError.js");
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies.token;
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { _id:payload.sub,role:payload.role };
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: "Not authenticated" });
  }
};

module.exports = verifyToken;
