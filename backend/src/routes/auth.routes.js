const express = require("express");
const rateLimit = require("express-rate-limit");
const validateRequest = require("../middleware/validateRequest.middleware.js")
const { register, login, refresh, logout, forgotPassword, resetPassword, emailVerification, resendVerificationEmail } = require("../controllers/auth.controller.js");
const validate = require("../middleware/validate.middleware.js");
const { 
    validateRegister,validateLogin,
    forgotPasswordSchema, resendVerificationSchema, verifyEmailSchema, resetPasswordSchema,
} = require("../validators/auth.validator.js");

const emailLimiter = rateLimit({
    windowMs: 15*60*1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  standardHeaders: "draft-8",
  legacyHeaders: false,
});


const router = express.Router();

router.post("/login", loginLimiter, validate(validateLogin), login);
router.post("/forgot-password",emailLimiter,validateRequest(forgotPasswordSchema),forgotPassword);
router.post("/reset-password/:token",validateRequest(resetPasswordSchema),resetPassword);
router.post("/verify-email",validateRequest(verifyEmailSchema),emailVerification);
router.post(
    "/resend-verification",
    emailLimiter,
    validateRequest(resendVerificationSchema),
    resendVerificationEmail
)
router.post(
    "/register",
    validate(validateRegister),
    register
);

router.post(
    "/refresh",
    refresh
);

router.post(
    "/logout",
    logout
);

module.exports = router
