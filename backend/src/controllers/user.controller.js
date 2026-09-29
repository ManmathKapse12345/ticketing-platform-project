const { updateProfile, getUserById, changePassword } = require("../services/user.service.js");
const { updateProfileSchema, changePasswordSchema } = require("../validators/user.validator.js");
const  ApiError = require("../utils/apiError.js");

const updateProfileRequest = async (req,res,next) => {
    try{
        const parsed = updateProfileSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({
                errors:parsed.error.flatten()
            });
        }
        const updatedUser = await updateProfile(req.user.id,parsed.data);
        return res.status(200).json({ user: updatedUser });
    }catch (err) {
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return next(err); // pass unexpected errors to a global error handler
    }
}

const getMe = async (req,res,next) => {
    try{
        // password and token fields are already omitted by the Prisma client (config/prisma.js)
        const user = await getUserById(req.user.id);
        return res.status(200).json({ user });
    }catch(err){
        if (err instanceof ApiError) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        return next(err);
    }
}

const changePasswordRequest = async (req,res,next) => {
    try{
        const parsed = changePasswordSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({
                errors:parsed.error.flatten()
            });
        }
        await changePassword(req.user.id,parsed.data);
        return res.status(200).json({ message: "Password changed successfully" });
    }catch(err){
        if (err instanceof ApiError) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        return next(err);
    }
}

module.exports = { updateProfileRequest, getMe, changePasswordRequest };
