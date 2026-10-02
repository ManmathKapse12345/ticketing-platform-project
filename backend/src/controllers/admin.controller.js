const {
  listOrganizations,
  setOrganizationVerification,
  listUsers,
} = require("../services/admin.service.js");
const { listAllPayouts, updatePayoutStatus } = require("../services/payout.service.js");
const {
  listOrganizationsSchema,
  listUsersSchema,
  setVerificationSchema,
  listPayoutsSchema,
  updatePayoutSchema,
} = require("../validators/admin.validator.js");

// Parses `source` with `schema`, or sends the 400 and returns undefined.
const parseOr400 = (schema, source, res) => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    res.status(400).json({ success: false, errors: parsed.error.flatten() });
    return undefined;
  }
  return parsed.data;
};

const listOrganizationsRequest = async (req, res, next) => {
  try {
    const query = parseOr400(listOrganizationsSchema, req.query, res);
    if (!query) return;
    const { organizations, pagination } = await listOrganizations(query);
    return res.status(200).json({ success: true, organizations, pagination });
  } catch (error) {
    next(error);
  }
};

const setOrganizationVerificationRequest = async (req, res, next) => {
  try {
    const body = parseOr400(setVerificationSchema, req.body, res);
    if (!body) return;
    const organization = await setOrganizationVerification(
      req.params.organizationId,
      body.verified,
    );
    return res.status(200).json({ success: true, organization });
  } catch (error) {
    next(error);
  }
};

const listUsersRequest = async (req, res, next) => {
  try {
    const query = parseOr400(listUsersSchema, req.query, res);
    if (!query) return;
    const { users, pagination } = await listUsers(query);
    return res.status(200).json({ success: true, users, pagination });
  } catch (error) {
    next(error);
  }
};

const listPayoutsRequest = async (req, res, next) => {
  try {
    const query = parseOr400(listPayoutsSchema, req.query, res);
    if (!query) return;
    const { payouts, pagination } = await listAllPayouts(query);
    return res.status(200).json({ success: true, payouts, pagination });
  } catch (error) {
    next(error);
  }
};

const updatePayoutRequest = async (req, res, next) => {
  try {
    const body = parseOr400(updatePayoutSchema, req.body, res);
    if (!body) return;
    const payout = await updatePayoutStatus(req.params.payoutId, body);
    return res.status(200).json({ success: true, payout });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listOrganizationsRequest,
  setOrganizationVerificationRequest,
  listUsersRequest,
  listPayoutsRequest,
  updatePayoutRequest,
};
