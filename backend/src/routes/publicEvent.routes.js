const express = require("express");
const validateObjectId = require("../middleware/validateObjectId.middleware.js");
const {
  listPublishedEventsRequest,
  getPublishedEventRequest,
  listPublicTicketTiersRequest,
} = require("../controllers/publicEvent.controller.js");

const router = express.Router();

router.get("/", listPublishedEventsRequest);
router.get("/:eventId", validateObjectId("eventId"), getPublishedEventRequest);
router.get("/:eventId/tiers", validateObjectId("eventId"), listPublicTicketTiersRequest);

module.exports = router;
