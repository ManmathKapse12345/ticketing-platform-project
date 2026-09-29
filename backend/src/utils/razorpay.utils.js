const crypto = require("crypto");

const requireSecret = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
};

const hmacMatches = (payload, secret, signature) => {
    if (typeof signature !== "string") return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    // timingSafeEqual throws on unequal lengths, and a length mismatch is a mismatch anyway
    return (
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    );
};

// Signature Checkout.js returns to the browser after a successful payment:
// HMAC-SHA256("<razorpay_order_id>|<razorpay_payment_id>", key secret)
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, signature) =>
    hmacMatches(
        `${razorpayOrderId}|${razorpayPaymentId}`,
        requireSecret("RAZORPAY_KEY_SECRET"),
        signature,
    );

// X-Razorpay-Signature header on webhooks: HMAC-SHA256(raw request body, webhook secret)
const verifyWebhookSignature = (rawBody, signature) =>
    hmacMatches(rawBody, requireSecret("RAZORPAY_WEBHOOK_SECRET"), signature);

module.exports = { verifyPaymentSignature, verifyWebhookSignature };
