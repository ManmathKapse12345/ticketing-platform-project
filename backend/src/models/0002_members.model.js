const mongoose = require("mongoose");

const ORG_ROLES = ["viewer","editor","admin","owner"];

const memberSchema = new mongoose.Schema(
    {
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        role:{
            type:String,
            enum:ORG_ROLES,
            required:true,
        },
        joinedAt:{
            type:Date,
            default:Date.now,
        }
    },
    {
        _id:false,
    }
);

module.exports = memberSchema;