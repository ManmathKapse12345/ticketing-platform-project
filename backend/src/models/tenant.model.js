const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name:{
      type:String,
      required:true
    },
    subscriptionPlan:{
      type:String,
      require:true,
      enum:["FREE","BASIC","PREMIUM"],
      default:"FREE"
    },
    status:{
      type:String,
      required:true
    },
    createdAt:Date
  },
  {
    timestamps:true
  }
);

module.exports = mongoose.model("Tenant",tenantSchema);