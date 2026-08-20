const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const updateProfileRequest = require("../controllers/user.controller.js");
const router = express.Router();

router.patch("/profile",verifyToken,updateProfileRequest);

module.exports = router;