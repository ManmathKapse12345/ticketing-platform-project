const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const { updateProfileRequest, getMe, changePasswordRequest } = require("../controllers/user.controller.js");
const router = express.Router();

router.get("/me",verifyToken,getMe);
router.patch("/profile",verifyToken,updateProfileRequest);
router.post("/change-password",verifyToken,changePasswordRequest);

module.exports = router;