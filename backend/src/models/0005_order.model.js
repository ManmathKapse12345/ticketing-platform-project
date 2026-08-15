// models/Order.js

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    organizerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organizer",
        required:true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "CANCELLED", "REFUNDED"],
        default: "PENDING"
    }
},
{
    timestamps: true
}
);

orderSchema.index({ userId: 1 });
orderSchema.index({ eventId: 1 });

module.exports = mongoose.model("Order", orderSchema);