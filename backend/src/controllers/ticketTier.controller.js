const {
  createTicketTier,
  listTicketTiers,
  updateTicketTier,
  deleteTicketTier,
} = require("../services/ticketTier.service.js");
const {
  createTicketTierSchema,
  updateTicketTierSchema,
} = require("../validators/ticketTier.validator.js");
const { toMinorUnits } = require("../utils/money.utils.js");

const toTierData = ({ price, ...rest }) =>
  price === undefined ? rest : { ...rest, priceMinor: toMinorUnits(price) };

const createTicketTierRequest = async (req, res, next) => {
  try {
    const parsed = createTicketTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const tier = await createTicketTier(
      req.params.eventId,
      req.params.organizationId,
      toTierData(parsed.data),
    );
    return res.status(201).json({ success: true, tier });
  } catch (error) {
    next(error);
  }
};

const listTicketTiersRequest = async (req, res, next) => {
  try {
    const tiers = await listTicketTiers(req.params.eventId, req.params.organizationId);
    return res.status(200).json({ success: true, tiers });
  } catch (error) {
    next(error);
  }
};

const updateTicketTierRequest = async (req, res, next) => {
  try {
    const parsed = updateTicketTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const tier = await updateTicketTier(
      req.params.tierId,
      req.params.eventId,
      req.params.organizationId,
      toTierData(parsed.data),
    );
    return res.status(200).json({ success: true, tier });
  } catch (error) {
    next(error);
  }
};

const deleteTicketTierRequest = async (req, res, next) => {
  try {
    const tier = await deleteTicketTier(
      req.params.tierId,
      req.params.eventId,
      req.params.organizationId,
    );
    return res.status(200).json({ success: true, tier });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicketTierRequest,
  listTicketTiersRequest,
  updateTicketTierRequest,
  deleteTicketTierRequest,
};
