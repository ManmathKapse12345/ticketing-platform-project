const updateProfile = require("../services/user.service.js");
const updateProfileSchema = require("../validators/user.validator.js");
const  ApiError = require("../utils/apiError.js");

const updateProfileRequest = async (req,res,next) => {
    try{
        const parsed = updateProfileSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({
                errors:parsed.error.flatten()
            });
        }
        const updatedUser = await updateProfile(req.user._id,parsed.data);
        return res.status(200).json({ user: updatedUser });
    }catch (err) {
      if (err instanceof ApiError) {
        throw new ApiError(err.statusCode,err.message);
        // return res.status(err.statusCode).json({ error: err.message });
      }
      return next(err); // pass unexpected errors to a global error handler
    }
}

module.exports = updateProfileRequest;