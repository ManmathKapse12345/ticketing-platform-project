// models/TicketTier.js

const mongoose = require("mongoose");

const ticketTierSchema = new mongoose.Schema(
{
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index:true
    },
    organizerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organizer",
        required:true,
        index:true
    }
    ,
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantityTotal: {
        type: Number,
        required: true
    },
    quantitySold:{
        type:Number,
        default:0
    },
    salesStart:Date,
    salesEnd:Date,
},
{
    timestamps: true
}
);

ticketTierSchema.index({ eventId: 1 });

module.exports = mongoose.model("TicketTier", ticketTierSchema);