const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const authorize = require("../middleware/requireRole.middleware.js");
const validateUuid = require("../middleware/validateUuid.middleware.js");
const {
  listOrganizationsRequest,
  setOrganizationVerificationRequest,
  listUsersRequest,
  listPayoutsRequest,
  updatePayoutRequest,
} = require("../controllers/admin.controller.js");

const router = express.Router();

// Platform staff only: User.role from the JWT, not an organization role.
router.use(verifyToken, authorize("platformAdmin"));

router.get("/organizations", listOrganizationsRequest);
router.patch(
  "/organizations/:organizationId/verification",
  validateUuid("organizationId"),
  setOrganizationVerificationRequest,
);
router.get("/users", listUsersRequest);
router.get("/payouts", listPayoutsRequest);
router.patch("/payouts/:payoutId", validateUuid("payoutId"), updatePayoutRequest);

module.exports = router;
