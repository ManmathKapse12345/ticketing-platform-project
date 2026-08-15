const express = require("express");
const authRoutes = require("./src/routes/auth.routes.js");
const errorHandler = require("./src/middleware/errorHandler.js");
const dns = require("dns");

dns.setServers([
  '1.1.1.1',
  '8.8.8.8'
]);

require("dotenv").config();

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use(errorHandler);

module.exports = app;
