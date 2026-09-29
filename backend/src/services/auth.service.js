const prisma = require("../config/prisma.js");
const {
  hashPassword,
  generateVerificationToken,
  generateToken,
} = require("../utils/auth.utils.js");
const { isUniqueViolation } = require("../utils/prisma.utils.js");
const ApiError = require("../utils/apiError.js");
const { encryptPayoutDetails } = require("./payout.service.js");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => email.trim().toLowerCase();

const saveRefreshToken = (jti, userId, db = prisma) =>
  db.refreshToken.create({
    data: {
      id: jti,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

const registerOwner = async (
  name,
  email,
  password,
  role,
  companyName,
  branding,
  payoutDetails,
) => {
  email = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  const company = await prisma.organization.findUnique({ where: { name: companyName } });
  if (company) {
    throw new ApiError(
      409,
      "Company already exists cannot create an account as an owner into this organization",
    );
  }

  const hashedPassword = await hashPassword(password);
  const { rawToken, hashedToken } = generateVerificationToken();

  try {
    const { user, organization } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "customer",
          verifyToken: hashedToken,
          verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: companyName,
          logoUrl: branding?.logoUrl,
          primaryColor: branding?.primaryColor,
          payoutDetailsEncrypted: payoutDetails ? encryptPayoutDetails(payoutDetails) : null,
          members: { create: { userId: user.id, role } },
        },
      });

      return { user, organization };
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    return { user, organization, verifyUrl };
  } catch (err) {
    // A concurrent registration took the same email or company name
    if (isUniqueViolation(err)) throw new ApiError(409, "Email or company already exists");
    throw err;
  }
};

const registerCustomer = async (name, email, password, role) => {
  email = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(400, "Email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const { rawToken, hashedToken } = generateVerificationToken();

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        verifyToken: hashedToken,
        verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    return { user, verifyUrl };
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(400, "Email already exists");
    throw err;
  }
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    omit: { password: false },
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

  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const rotateRefreshToken = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.userId !== payload.sub) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (stored.revoked) {
    // A revoked token being presented again indicates token reuse.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
    throw new ApiError(401, "Refresh token reuse detected");
  }

  if (stored.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const tokens = await generateToken(user);

  await prisma.$transaction(async (tx) => {
    // "revoked: false" in the filter makes this an atomic claim: if a concurrent
    // refresh already revoked this token, nothing matches and count is 0.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revoked: false },
      data: { revoked: true, revokedAt: new Date(), replacedBy: tokens.jti },
    });
    if (count === 0) {
      throw new ApiError(401, "Refresh token reuse detected");
    }

    await saveRefreshToken(tokens.jti, user.id, tx);
  });

  return tokens;
};

const logoutUser = async (refreshToken) => {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  await prisma.refreshToken.updateMany({
    where: { id: payload.jti, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
  return payload;
};

const userForgotPassword = async (email) => {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  if (!user) {
    return { user: null };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset_password/${rawToken}`;

  return { user: updated, resetUrl };
};

const userResetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new ApiError(400, "Token and newPassword is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or Expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return { user: updated };
};

const verifyEmail = async (token) => {
  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      verifyToken: hashedToken,
      verifyTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or Expired verification link.");
  }

  if (user.isVerified) {
    throw new ApiError(400, "Email already verified");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verifyToken: null, verifyTokenExpires: null },
  });
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
  saveRefreshToken,
  normalizeEmail,
};
