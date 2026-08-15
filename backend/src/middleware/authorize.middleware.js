const authorize = (...roles) => {
    return (req,res,next) => {
        if(req.body.role && 
            !roles.includes(
                req.body.role
            )
        ){
            return res.status(403).json({
                message:"Forbidden"
            });
        }

        next();
    };
};

module.exports = authorize;