const {
  updatePayoutDetails,
  requestPayout,
  listOrganizationPayouts,
} = require("../services/payout.service.js");
const { payoutDetailsSchema } = require("../validators/payout.validator.js");

const updatePayoutDetailsRequest = async (req, res, next) => {
  try {
    const parsed = payoutDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    await updatePayoutDetails(req.params.organizationId, parsed.data, req.user.id);
    return res.status(200).json({ success: true, message: "Payout details updated" });
  } catch (error) {
    next(error);
  }
};

const listPayoutsRequest = async (req, res, next) => {
  try {
    const { balance, payouts } = await listOrganizationPayouts(req.params.organizationId);
    return res.status(200).json({ success: true, balance, payouts });
  } catch (error) {
    next(error);
  }
};

const requestPayoutRequest = async (req, res, next) => {
  try {
    const payout = await requestPayout(req.params.organizationId, req.user.id);
    return res.status(201).json({ success: true, payout });
  } catch (error) {
    next(error);
  }
};

module.exports = { updatePayoutDetailsRequest, listPayoutsRequest, requestPayoutRequest };
