const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware");
const authorize = require("../middleware/requireRole.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");
const { getOrderRequest, getAllOrderRequest, paymentIntentRequest } = require("../controllers/order.controller");
const router = express.Router({ mergeParams:true });

router.use(verifyToken);

const CUSTOMER_UP = ["customer","platformAdmin"];

router.get(
    "/",
    authorize(...CUSTOMER_UP),
    getAllOrderRequest
)

router.get(
    "/:orderId",
    validateObjectId("orderId"),
    authorize(...CUSTOMER_UP),
    getOrderRequest
)

router.post(
    "/:orderId/payment-intent",
    validateObjectId("orderId"),
    authorize(...CUSTOMER_UP),
    paymentIntentRequest
)

module.exports = router;