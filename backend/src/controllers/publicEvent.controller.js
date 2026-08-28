const {
  listPublishedEvents,
  getPublishedEvent,
  listPublicTicketTiers,
} = require("../services/publicEvent.service.js");

const listPublishedEventsRequest = async (req, res, next) => {
  try {
    const events = await listPublishedEvents();
    return res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

const getPublishedEventRequest = async (req, res, next) => {
  try {
    const event = await getPublishedEvent(req.params.eventId);
    return res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

const listPublicTicketTiersRequest = async (req, res, next) => {
  try {
    const tiers = await listPublicTicketTiers(req.params.eventId);
    return res.status(200).json({ success: true, tiers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPublishedEventsRequest,
  getPublishedEventRequest,
  listPublicTicketTiersRequest,
};
