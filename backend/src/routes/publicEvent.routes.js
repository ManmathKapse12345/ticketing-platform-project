const express = require("express");
const validateUuid = require("../middleware/validateUuid.middleware.js");
const {
  listPublishedEventsRequest,
  getPublishedEventRequest,
  listPublicTicketTiersRequest,
} = require("../controllers/publicEvent.controller.js");

const router = express.Router();

router.get("/", listPublishedEventsRequest);
router.get("/:eventId", validateUuid("eventId"), getPublishedEventRequest);
router.get(
  "/:eventId/tiers",
  validateUuid("eventId"),
  listPublicTicketTiersRequest,
);

module.exports = router;
