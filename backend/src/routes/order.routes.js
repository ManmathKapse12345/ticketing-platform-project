const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware");
const authorize = require("../middleware/requireRole.middleware");
const validateUuid = require("../middleware/validateUuid.middleware");
const {
  getOrderRequest,
  getAllOrderRequest,
  checkoutRequest,
  verifyPaymentRequest,
} = require("../controllers/order.controller");
const router = express.Router({ mergeParams: true });

router.use(verifyToken);

const CUSTOMER_UP = ["customer", "platformAdmin"];

router.get("/", authorize(...CUSTOMER_UP), getAllOrderRequest);

router.get(
  "/:orderId",
  validateUuid("orderId"),
  authorize(...CUSTOMER_UP),
  getOrderRequest,
);

router.post(
  "/:orderId/checkout",
  validateUuid("orderId"),
  authorize(...CUSTOMER_UP),
  checkoutRequest,
);

router.post(
  "/:orderId/verify-payment",
  validateUuid("orderId"),
  authorize(...CUSTOMER_UP),
  verifyPaymentRequest,
);

module.exports = router;
