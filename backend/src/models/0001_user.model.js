const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim:true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase:true,
    trim:true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  role: {
    type: String,
    enum:["customer","platformAdmin"],
    default:"customer"
  },
  resetPasswordToken:String,
  resetPasswordExpires:Date,
  isVerified:{
    type:Boolean,
    default:false
  },
  verifyToken:String,
  verifyTokenExpires:Date,
},
{
    timestamps:true
}
);

module.exports = mongoose.model("User", userSchema);
