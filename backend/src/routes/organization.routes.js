const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const {acceptExistingInvite, registerNewInviteUser, removeMemberRequest, inviteMemberRequest,updateRoleRequest }= require("../controllers/member.controller.js");
const verifyAccount = require("../middleware/verifyAccount.middleware.js");
const requireOrganizationRole = require("../middleware/verifyOwner.middleware.js");
const validateObjectId = require("../middleware/validateObjectId.middleware.js");
const router = express.Router();

router.post("/:organizationId/invite",validateObjectId("organizationId"),verifyToken,requireOrganizationRole("owner"),inviteMemberRequest);
router.post("/invite/:token/register",registerNewInviteUser);
router.post("/invite/:token/accept",verifyAccount,acceptExistingInvite);
router.delete("/:organizationId/members/:memberId",validateObjectId("organizationId", "memberId"),verifyToken,requireOrganizationRole("owner"),removeMemberRequest);
router.patch("/:organizationId/members/:memberId/role",validateObjectId("organizationId", "memberId"),verifyToken,requireOrganizationRole("owner"),updateRoleRequest);

module.exports = router;