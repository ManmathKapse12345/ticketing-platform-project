const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware.js");
const requireOrganizationRole = require("../middleware/verifyOwner.middleware.js");
const validateUuid = require("../middleware/validateUuid.middleware.js");
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
const { createOrderRequest } = require("../controllers/order.controller.js");
const authorize = require("../middleware/requireRole.middleware.js");
const {
  checkInTicketRequest,
  listEventTicketsRequest,
} = require("../controllers/ticket.controller.js");

const router = express.Router({ mergeParams: true });

const ANY_MEMBER = ["viewer", "editor", "admin", "owner"];
const EDITOR_UP = ["editor", "admin", "owner"];
const ADMIN_UP = ["admin", "owner"];
const CUSTOMER_UP = ["customer", "platformAdmin"];

router.use(verifyToken);

router.post("/", requireOrganizationRole(...EDITOR_UP), createEventRequest);
router.get("/", requireOrganizationRole(...ANY_MEMBER), listEventsRequest);
router.get(
  "/:eventId",
  validateUuid("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  getEventRequest,
);
router.patch(
  "/:eventId",
  validateUuid("eventId"),
  requireOrganizationRole(...EDITOR_UP),
  updateEventRequest,
);
router.delete(
  "/:eventId",
  validateUuid("eventId"),
  requireOrganizationRole(...ADMIN_UP),
  cancelEventRequest,
);

router.post(
  "/:eventId/tiers",
  validateUuid("eventId"),
  requireOrganizationRole(...EDITOR_UP),
  createTicketTierRequest,
);
router.get(
  "/:eventId/tiers",
  validateUuid("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  listTicketTiersRequest,
);
router.patch(
  "/:eventId/tiers/:tierId",
  validateUuid("eventId", "tierId"),
  requireOrganizationRole(...EDITOR_UP),
  updateTicketTierRequest,
);
router.delete(
  "/:eventId/tiers/:tierId",
  validateUuid("eventId", "tierId"),
  requireOrganizationRole(...ADMIN_UP),
  deleteTicketTierRequest,
);

router.post(
  "/:eventId/orders",
  validateUuid("eventId"),
  authorize(...CUSTOMER_UP),
  createOrderRequest,
);

router.post(
  "/:eventId/checkin",
  validateUuid("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  checkInTicketRequest,
);

router.get(
  "/:eventId/tickets",
  validateUuid("eventId"),
  requireOrganizationRole(...ANY_MEMBER),
  listEventTicketsRequest,
);

module.exports = router;
