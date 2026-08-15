// models/Event.js

const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
{
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organizer",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    venue: String,
    startDate:{
        type:Date,
        required:true
    },
    endDate: Date,
    status: {
        type: String,
        enum: ["DRAFT", "PUBLISHED", "CANCELLED"],
        default: "DRAFT"
    }
},
{
    timestamps: true
}
);

eventSchema.index({ organizerId: 1 });
eventSchema.index({ startDate: 1 });

module.exports = mongoose.model("Event", eventSchema);