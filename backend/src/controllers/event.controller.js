const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  cancelEvent,
} = require("../services/event.service.js");
const {
  createEventSchema,
  updateEventSchema,
} = require("../validators/event.validator.js");

const createEventRequest = async (req, res, next) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const event = await createEvent(req.params.organizationId, parsed.data);
    return res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

const listEventsRequest = async (req, res, next) => {
  try {
    const events = await listEvents(req.params.organizationId);
    return res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

const getEventRequest = async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventId, req.params.organizationId);
    return res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

const updateEventRequest = async (req, res, next) => {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const event = await updateEvent(
      req.params.eventId,
      req.params.organizationId,
      parsed.data,
    );
    return res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

const cancelEventRequest = async (req, res, next) => {
  try {
    const { event, refunds } = await cancelEvent(req.params.eventId, req.params.organizationId);
    return res.status(200).json({ success: true, event, refunds });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createEventRequest,
  listEventsRequest,
  getEventRequest,
  updateEventRequest,
  cancelEventRequest,
};
