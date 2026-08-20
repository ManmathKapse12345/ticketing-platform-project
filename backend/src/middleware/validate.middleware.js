const validate = (validationFn) => {
    return (req,res,next) => {
        try {
            const error = validationFn(req.body);
            if(error){
                return res.status(400).json({
                    success:false,
                    message:error.details?error.details[0].message:error.message
                });
            }
        } catch (error) {
            return res.status(400).json({
                success:false,
                message:error.details?error.details[0].message:error.message
            });
        }
        next();
    };
};

module.exports = validate;