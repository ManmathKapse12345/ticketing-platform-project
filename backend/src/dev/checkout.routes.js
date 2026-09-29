// Dev-only test page for paying an order through Razorpay Checkout.
// Mounted by app.js at /dev when NODE_ENV !== "production".
const path = require("path");
const express = require("express");

const router = express.Router();

// Helmet's default policy blocks Razorpay's script, iframe and popups (card 3-D Secure,
// UPI apps), so this page gets its own policy that allows exactly those.
const RAZORPAY_CSP = [
  "default-src 'self'",
  "script-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://*.razorpay.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  "frame-src https://*.razorpay.com",
  "connect-src 'self' https://*.razorpay.com",
].join("; ");

router.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", RAZORPAY_CSP);
  res.removeHeader("Cross-Origin-Opener-Policy");
  next();
});

router.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

router.use(express.static(path.join(__dirname, "public")));

module.exports = router;
