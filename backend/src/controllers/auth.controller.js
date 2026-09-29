const {
  registerCustomer,
  loginUser,
  registerOwner,
  rotateRefreshToken,
  logoutUser,
  userForgotPassword,
  userResetPassword,
  verifyEmail,
  saveRefreshToken,
} = require("../services/auth.service.js");
const { generateToken, sendEmail } = require("../utils/auth.utils.js");
const ApiError = require("../utils/apiError.js");

const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      companyName,
      branding,
      payoutDetails,
    } = req.body;
    if (!role) {
      const { user, verifyUrl } = await registerCustomer(
        name,
        email,
        password,
        "customer",
      );
      const { accessToken, refreshToken, jti } = await generateToken(user);
      await saveRefreshToken(jti, user.id);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      await sendEmail(
        user.email,
        "Verify your email",
        `
      <p>Click below to verify your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
      `,
      );
      res.status(201).json({
        success: true,
        message:
          "Registration successful and your Account is created. Check your email to verify.",
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken: accessToken,
      });
    } else if (role === "owner") {
      const { user, organization, verifyUrl } = await registerOwner(
        name,
        email,
        password,
        role,
        companyName,
        branding,
        payoutDetails,
      );
      const { accessToken, refreshToken, jti } = await generateToken(
        user,
      );
      await saveRefreshToken(jti, user.id);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      await sendEmail(
        user.email,
        "Verify your email",
        `
      <p>Click below to verify your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
      `,
      );
      res.status(201).json({
        success: true,
        message:
          "Registration successful and your Account is created. Check your email to verify.",
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken: accessToken,
      });
    } else {
      throw new ApiError(
        400,
        "Cannot create account through other domains, you can either create account as a customer or as an organization",
      );
    }
  } catch (error) {
    // throw new ApiError(error.statusCode,"Registration error : "+error.message);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    const { accessToken, refreshToken, jti } = await generateToken(user);
    await saveRefreshToken(jti, user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken: accessToken,
    });
  } catch (error) {
    // throw new ApiError(error.statusCode,"Login Error :- "+error.message);
    next(error);
  }
};

const refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return next(new ApiError(401, "No refresh token"));

  try {
    const { accessToken, refreshToken: replacementToken } =
      await rotateRefreshToken(refreshToken);

    res.cookie("refreshToken", replacementToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ accessToken });
  } catch (error) {
    return next(
      error instanceof ApiError
        ? error
        : new ApiError(401, "Invalid or expired refresh token"),
    );
  }
};

const logout = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const payload = await logoutUser(refreshToken);
    } catch {}
  }
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { user, resetUrl } = await userForgotPassword(email);
    if (user) {
      await sendEmail(
        user.email,
        "Password Reset Request",
        `
      <p>You requested a password request.</p>
      <p><a href = "${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
      `,
      );
    }

    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    await userResetPassword(token, newPassword);

    return res.status(200).json({
      message: "Password reset successfull",
    });
  } catch (error) {
    next(error);
  }
};

const emailVerification = async (req, res, next) => {
  const { token } = req.body;

  await verifyEmail(token);

  return res.status(200).json({
    message: "Email verified successfully",
  });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  emailVerification,
};
