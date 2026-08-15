const jwt = require("jsonwebtoken");

const protect = async (req,res,next) => {
    const token = req.header.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message:"Unauthorized"
        });
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
    );

    req.user = decoded;
    next();
};