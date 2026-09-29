const express = require("express");
const verifySignature = require("../middleware/verifySignature.middleware");
const { processWebhookOnce } = require("../services/webhook.service");
const handleWebhook = require("../controllers/webhook.controller");
const router = express.Router();

const ALLOWED_GATEWAYS = ["razorpay"];

router.post(
    "/webhook/:gateway",
    (req, res, next) => {
        if (!ALLOWED_GATEWAYS.includes(req.params.gateway)) {
            return res.status(404).json({ success: false, message: "Unknown gateway" });
        }
        next();
    },
    verifySignature,
    handleWebhook
)

module.exports = router;