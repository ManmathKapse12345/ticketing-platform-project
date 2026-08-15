// models/Refund.js

const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
{
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: String,
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    }
},
{
    timestamps: true
}
);

refundSchema.index({ paymentId: 1 });

module.exports = mongoose.model("Refund", refundSchema);