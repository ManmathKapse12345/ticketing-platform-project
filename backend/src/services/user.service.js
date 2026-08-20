const bcrypt = require("bcrypt");
const User = require("../models/0001_user.model");
const ApiError = require("../utils/apiError.js");
const { sendEmail, generateVerificationToken } = require("../utils/auth.utils.js");

const updateProfile = async (userId, { name, email, currentPassword, newPassword }) => {
    const user = await User.findById(userId).select("+password");
    if(!user){
        throw new ApiError(404," User not found ");
    }

    if(name !== undefined){
        user.name = name;
    }

    let verifyUrl;
    if(email !== undefined && email.toLowerCase() !== user.email ){
        const existing = await User.findOne({email:email.toLowerCase()});
        if(existing){
            throw new ApiError(409, "Email already in use");
        }

        const { rawToken, hashedToken } = generateVerificationToken();
        user.email = email.toLowerCase();
        user.isVerified = false;
        user.verifyToken = hashedToken;
        user.verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    }

    if(newPassword){
        const valid = await bcrypt.compare(currentPassword,user.password);
        if(!valid){
            throw new ApiError(401,"Current Password is incorrect");
        }
        user.password = await bcrypt.hash(newPassword,12);
    }

    try{
        await user.save();
    }catch(err){
        if(err.code === 11000){
            throw new ApiError(409,"Email Already in use");
        }
        throw err;
    }

    if(verifyUrl){
        await sendEmail(
            user.email,
            "Verify your new email",
            `<p>Click below to verify your new email address:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>This link expires in 24 hours.</p>`,
        );
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.verifyToken;
    delete safeUser.verifyTokenExpires;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;
    return safeUser;
}

module.exports = updateProfile;
