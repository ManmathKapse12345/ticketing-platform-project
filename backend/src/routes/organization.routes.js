const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const {
  acceptExistingInvite,
  registerNewInviteUser,
  removeMemberRequest,
  inviteMemberRequest,
  updateRoleRequest,
} = require("../controllers/member.controller.js");
const verifyAccount = require("../middleware/verifyAccount.middleware.js");
const requireOrganizationRole = require("../middleware/verifyOwner.middleware.js");
const validateUuid = require("../middleware/validateUuid.middleware.js");
const {
  getOrganizationByIdRequest,
  getOrganizationByMemberIdRequest,
  updateOrganizationByIdRequest,
  getAllMembersByOrganizationIdRequest,
} = require("../controllers/organization.controller.js");
const { createRefundRequest } = require("../controllers/refund.controller.js");
const {
  listOrganizationOrdersRequest,
  getOrganizationOrderRequest,
} = require("../controllers/order.controller.js");
const router = express.Router();

const ADMIN_UP = ["admin", "owner"];
const ALL_ROLES = ["viewer", "editor", "admin", "owner"];

router.post(
  "/:organizationId/invite",
  validateUuid("organizationId"),
  verifyToken,
  requireOrganizationRole("owner"),
  inviteMemberRequest,
);
router.post("/invite/:token/register", registerNewInviteUser);
router.post("/invite/:token/accept", verifyAccount, acceptExistingInvite);
router.delete(
  "/:organizationId/members/:memberId",
  validateUuid("organizationId", "memberId"),
  verifyToken,
  requireOrganizationRole("owner"),
  removeMemberRequest,
);
router.patch(
  "/:organizationId/members/:memberId/role",
  validateUuid("organizationId", "memberId"),
  verifyToken,
  requireOrganizationRole("owner"),
  updateRoleRequest,
);
router.post(
  "/:organizationId/orders/:orderId/refund",
  validateUuid("organizationId", "orderId"),
  verifyToken,
  requireOrganizationRole(...ADMIN_UP),
  createRefundRequest,
);
router.get(
  "/:organizationId/orders",
  validateUuid("organizationId"),
  verifyToken,
  requireOrganizationRole(...ADMIN_UP),
  listOrganizationOrdersRequest,
);
router.get(
  "/:organizationId/orders/:orderId",
  validateUuid("organizationId", "orderId"),
  verifyToken,
  requireOrganizationRole(...ADMIN_UP),
  getOrganizationOrderRequest,
);
router.get(
  "/:organizationId",
  validateUuid("organizationId"),
  verifyToken,
  requireOrganizationRole(...ALL_ROLES),
  getOrganizationByIdRequest,
);
router.get("/", verifyToken, getOrganizationByMemberIdRequest);
router.patch(
  "/:organizationId",
  validateUuid("organizationId"),
  verifyToken,
  requireOrganizationRole("owner"),
  updateOrganizationByIdRequest,
);
router.get(
  "/:organizationId/members",
  validateUuid("organizationId"),
  verifyToken,
  requireOrganizationRole(...ALL_ROLES),
  getAllMembersByOrganizationIdRequest,
);

module.exports = router;
