// models/Payment.js

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
{
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    gateway: {
        type: String,
        enum: ["STRIPE", "RAZORPAY"]
    },
    paymentIntentId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: true
    }
},
{
    timestamps: true
}
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentIntentId: 1 }, { unique: true });

module.exports = mongoose.model("Payment", paymentSchema);