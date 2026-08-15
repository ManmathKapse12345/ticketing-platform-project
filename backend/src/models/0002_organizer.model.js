const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true
        },
        members:[{
            userId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User",
                required:true
            },
            role:{
                type:String,
                enum:["owner","admin","editor","viewer"],
                default:"editor"
            }
        }],
        branding:{
            logoUrl:String,
            primaryColor:String
        },
        payoutDetails:{
            bankAccount:String
        }
    },
    {
        timestamps:true
    }
);

organizerSchema.index({"members.userId":1});

module.exports = mongoose.model("Organization",organizerSchema);