const express = require("express");
const authRoutes = require("./src/routes/auth.routes.js");
const errorHandler = require("./src/middleware/errorHandler.js");
const userRoutes = require("./src/routes/user.routes.js");
const organizationRoutes = require("./src/routes/organization.routes.js");
const eventRoutes = require("./src/routes/event.routes.js");
const validateObjectId = require("./src/middleware/validateObjectId.middleware.js");
const cookieParser = require("cookie-parser");
const dns = require("dns");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const requestId = require("./src/middleware/requestId.middleware.js");

dns.setServers([
  '1.1.1.1',
  '8.8.8.8'
]);

require("dotenv").config();

const app = express();

app.use(requestId);
app.use(pinoHttp({
  genReqId: (req) => req.id,
  redact: ["req.headers.authorization", "req.headers.cookie"],
}));
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : false,
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));
app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users",userRoutes);
app.use("/api/organization",organizationRoutes);
app.use(
  "/api/organization/:organizationId/events",
  validateObjectId("organizationId"),
  eventRoutes,
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend is running", requestId: req.id });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found", requestId: req.id });
});

app.use(errorHandler);

module.exports = app;
