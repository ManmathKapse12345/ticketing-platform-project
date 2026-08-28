// backend/src/controllers/refund.controller.js
const { createRefundSchema } = require("../validators/refund.validator.js");
const { createRefund } = require("../services/refund.service.js");

const createRefundRequest = async (req, res, next) => {
  try {
    const parsed = createRefundSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const { organizationId, orderId } = req.params;
    const { amountMinor, reason } = parsed.data;
    const refund = await createRefund(organizationId, orderId, amountMinor, reason);
    return res.status(201).json({ success: true, refund });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRefundRequest };
