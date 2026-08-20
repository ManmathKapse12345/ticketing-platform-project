const User = require("../models/0001_user.model.js");
const Organization = require("../models/0003_organizer.model.js");
const {
  hashPassword,
  sendEmail,
  generateVerificationToken,
  generateToken,
} = require("../utils/auth.utils.js");
const RefreshToken = require("../models/0010_refresh_token.js");
const ApiError = require("../utils/apiError.js");
const { encryptPayoutDetails } = require("./payout.service.js");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");

const registerOwner = async (
  name,
  email,
  password,
  role,
  companyName,
  branding,
  payoutDetails,
) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { rawToken, hashedToken } = generateVerificationToken();
    const user = await User.create(
      [
        {
          name,
          email,
          password: hashedPassword,
          role: "customer",
          verifyToken: hashedToken,
          verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
        },
      ],
      { session },
    );

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    const company = await Organization.findOne({ name: companyName });
    if (company) {
      throw new Error(
        "Company already exists cannot create an account as an owner into this organization",
      );
    }
    const organization = await Organization.create(
      [
        {
          name: companyName,
          members: [
            {
              userId: user[0]._id,
              role: role,
            },
          ],
          branding,
          payoutDetails: encryptPayoutDetails(payoutDetails),
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return {
      user: user[0],
      organization: organization[0],
      verifyUrl,
    };
  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(
      err.statusCode,
      "Owner registration fails : " + err.message,
    );
  } finally {
    await session.endSession();
  }
};

const registerCustomer = async (name, email, password, role) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "Email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const { rawToken, hashedToken } = generateVerificationToken();

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role,
    verifyToken: hashedToken,
    verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  });

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  return { user, verifyUrl };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({
    email,
  });

  if (!user) {
    throw new ApiError(400, "Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(400, "Invalid email or password");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email first");
  }

  return user;
};

const rotateRefreshToken = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const stored = await RefreshToken.findById(payload.jti);
  if (!stored || stored.userId.toString() !== payload.sub.toString()) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (stored.revoked) {
    // A revoked token being presented again indicates token reuse.
    await RefreshToken.updateMany(
      { userId: stored.userId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
    throw new ApiError(401, "Refresh token reuse detected");
  }

  if (stored.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const tokens = await generateToken(user);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const current = await RefreshToken.findOne({ _id: stored._id }).session(
        session,
      );
      if (!current || current.revoked) {
        throw new ApiError(401, "Refresh token reuse detected");
      }

      const revoked = await RefreshToken.findOneAndUpdate(
        { _id: current._id, revoked: false },
        {
          $set: {
            revoked: true,
            revokedAt: new Date(),
            replacedBy: tokens.jti,
          },
        },
        { new: true, session },
      );

      if (!revoked) {
        throw new ApiError(401, "Refresh token reuse detected");
      }

      await RefreshToken.create(
        [
          {
            _id: tokens.jti,
            userId: user._id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return tokens;
};

const logoutUser = async (refreshToken) => {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  await RefreshToken.updateOne(
    { _id: payload.jti, userId: payload.sub, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } },
  );
  return payload;
};

const userForgotPassword = async (email) => {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    return { user: null };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset_password/${rawToken}`;

  return { user, resetUrl };
};

const userResetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new ApiError(400, "Token and newPassword is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or Expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { user };
};

const verifyEmail = async (token) => {
  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    verifyToken: hashedToken,
    verifyTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or Expired verification link.");
  }

  if (user.isVerified) {
    throw new ApiError(400, "Email already verified");
  }

  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
};

module.exports = {
  loginUser,
  registerCustomer,
  registerOwner,
  rotateRefreshToken,
  logoutUser,
  userForgotPassword,
  userResetPassword,
  verifyEmail,
};
