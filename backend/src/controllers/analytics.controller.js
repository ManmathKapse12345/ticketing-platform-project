const {
  getEventAnalytics,
  getOrganizationOverview,
} = require("../services/analytics.service.js");
const { analyticsRangeSchema } = require("../validators/analytics.validator.js");

const getEventAnalyticsRequest = async (req, res, next) => {
  try {
    const parsed = analyticsRangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const analytics = await getEventAnalytics(
      req.params.eventId,
      req.params.organizationId,
      parsed.data,
    );
    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
};

const getOrganizationOverviewRequest = async (req, res, next) => {
  try {
    const analytics = await getOrganizationOverview(req.params.organizationId);
    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEventAnalyticsRequest, getOrganizationOverviewRequest };
