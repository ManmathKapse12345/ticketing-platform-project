const prisma = require("./prisma.js");

const connectDB = async () => {
    try{
        await prisma.$connect();
        console.log("PostgreSQL connected");
    }catch(error){
        console.error("PostgreSQL Connection Error :- ",error);
        process.exit(1);
    }
};

module.exports = connectDB;
