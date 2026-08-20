const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const requireOrganizationRole = require("../middleware/verifyOwner.middleware.js");
const validateObjectId = require("../middleware/validateObjectId.middleware.js");
const {
  createEventRequest,
  listEventsRequest,
  getEventRequest,
  updateEventRequest,
  cancelEventRequest,
} = require("../controllers/event.controller.js");
const {
  createTicketTierRequest,
  listTicketTiersRequest,
  updateTicketTierRequest,
  deleteTicketTierRequest,
} = require("../controllers/ticketTier.controller.js");

const router = express.Router({ mergeParams: true });

const ANY_MEMBER = ["viewer", "editor", "admin", "owner"];
const EDITOR_UP = ["editor", "admin", "owner"];
const ADMIN_UP = ["admin", "owner"];

router.use(verifyToken);

router.post("/", requireOrganizationRole(...EDITOR_UP), createEventRequest);
router.get("/", requireOrganizationRole(...ANY_MEMBER), listEventsRequest);
router.get(
  "/:eventId",
  validateObjectId("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  getEventRequest,
);
router.patch(
  "/:eventId",
  validateObjectId("eventId"),
  requireOrganizationRole(...EDITOR_UP),
  updateEventRequest,
);
router.delete(
  "/:eventId",
  validateObjectId("eventId"),
  requireOrganizationRole(...ADMIN_UP),
  cancelEventRequest,
);

router.post(
  "/:eventId/tiers",
  validateObjectId("eventId"),
  requireOrganizationRole(...EDITOR_UP),
  createTicketTierRequest,
);
router.get(
  "/:eventId/tiers",
  validateObjectId("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  listTicketTiersRequest,
);
router.patch(
  "/:eventId/tiers/:tierId",
  validateObjectId("eventId", "tierId"),
  requireOrganizationRole(...EDITOR_UP),
  updateTicketTierRequest,
);
router.delete(
  "/:eventId/tiers/:tierId",
  validateObjectId("eventId", "tierId"),
  requireOrganizationRole(...ADMIN_UP),
  deleteTicketTierRequest,
);

module.exports = router;
