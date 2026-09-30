const {
  listPublishedEvents,
  getPublishedEvent,
  listPublicTicketTiers,
} = require("../services/publicEvent.service.js");
const listPublishedEventsSchema = require("../validators/publicEvent.validator.js");

const listPublishedEventsRequest = async (req, res, next) => {
  try {
    const parsed = listPublishedEventsSchema.safeParse(req.query);
    if(!parsed.success){
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const { events, pagination } = await listPublishedEvents(parsed.data);
    return res.status(200).json({ success: true, events, pagination });
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
