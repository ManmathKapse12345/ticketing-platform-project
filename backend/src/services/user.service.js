const bcrypt = require("bcrypt");
const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");
const { isUniqueViolation } = require("../utils/prisma.utils.js");
const { sendEmail, generateVerificationToken } = require("../utils/auth.utils.js");

// The global `omit` in config/prisma.js hides password; these two flows need it.
const findUserWithPassword = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        omit: { password: false },
    });
    if(!user){
        throw new ApiError(404," User not found ");
    }
    return user;
}

const updateProfile = async (userId, { name, email, currentPassword, newPassword }) => {
    const user = await findUserWithPassword(userId);
    const data = {};

    if(name !== undefined){
        data.name = name;
    }

    let verifyUrl;
    const normalizedEmail = email?.trim().toLowerCase();
    if(normalizedEmail !== undefined && normalizedEmail !== user.email ){
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if(existing){
            throw new ApiError(409, "Email already in use");
        }

        const { rawToken, hashedToken } = generateVerificationToken();
        data.email = normalizedEmail;
        data.isVerified = false;
        data.verifyToken = hashedToken;
        data.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    }

    if(newPassword){
        const valid = await bcrypt.compare(currentPassword,user.password);
        if(!valid){
            throw new ApiError(401,"Current Password is incorrect");
        }
        data.password = await bcrypt.hash(newPassword,12);
    }

    let updated;
    try{
        updated = await prisma.user.update({ where: { id: user.id }, data });
    }catch(err){
        if(isUniqueViolation(err)){
            throw new ApiError(409,"Email Already in use");
        }
        throw err;
    }

    if(verifyUrl){
        await sendEmail(
            updated.email,
            "Verify your new email",
            `<p>Click below to verify your new email address:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>This link expires in 24 hours.</p>`,
        );
    }

    return updated;
}

const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if(!user){
        throw new ApiError(404," User not found ");
    }
    return user;
}

const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await findUserWithPassword(userId);

    const valid = await bcrypt.compare(currentPassword,user.password);
    if(!valid){
        throw new ApiError(401,"Current Password is incorrect");
    }

    const [updated] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { password: await bcrypt.hash(newPassword,12) },
        }),
        prisma.refreshToken.updateMany({
            where: { userId: user.id, revoked: false },
            data: { revoked: true, revokedAt: new Date() },
        }),
    ]);

    return updated;
}

module.exports = { updateProfile, getUserById, changePassword };
