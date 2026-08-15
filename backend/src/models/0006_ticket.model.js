const mongoose = require("mongoose");
const orderModel = require("./0005_order.model");

const ticketSchema = new mongoose.Schema(
    {
        orderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Order",
            required:true,
            index:true
        },
        eventId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Event",
            required:true,
            index:true
        },
        organizerId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Organizer",
            required:true,
            index:true,
        },
        ownerUserId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
            index:true,
        },
        qrCode:{
            type:String,
            required:true,
        },
        status:{
            type:String,
            enum:["active","used","cancelled"],
            default:"active"
        }
    },
    {
        timestamps:true
    }
)

ticketSchema.index({ orderId: 1 });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ qrCode: 1 }, { unique: true });

module.exports = mongoose.model("Ticket",ticketSchema);