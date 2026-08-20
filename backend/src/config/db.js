const mongoose = require("mongoose");

const connectDB = async (req,res) => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");
    } catch(error){
        console.error("MongoDB Connection Error :- ",error);
        process.exit(1);
    }
};

module.exports = connectDB;