const express = require("express");
const { register, login, refresh, logout, forgotPassword, resetPassword, emailVerification } = require("../controllers/auth.controller.js");
const validate = require("../middleware/validate.middleware.js");
const { validateRegister,validateLogin } = require("../validators/auth.validator.js");

const router = express.Router();

router.post(
    "/register",
    validate(validateRegister),
    register
);

router.post(
    "/login",
    validate(validateLogin),
    login
);

router.post(
    "/refresh",
    refresh
);

router.post(
    "/logout",
    logout
);

router.post(
    "/forgot-password",
    forgotPassword
);

router.post(
    "/reset-password/:token",
    resetPassword
);

router.post(
    "/verify-email",
    emailVerification
)

module.exports = router
