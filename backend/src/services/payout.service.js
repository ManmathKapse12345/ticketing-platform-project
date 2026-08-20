const Organization = require("../models/0003_organizer.model.js");
const { encryptSecret } = require("../utils/secret.utils.js");
const ApiError = require("../utils/apiError.js");
const crypto = require("crypto");

const decryptPayoutDetails = (encryptedValue) => {
  const keyValue = process.env.PAYOUT_ENCRYPTION_KEY;
  const key = Buffer.from(keyValue || "", "hex");
  if (key.length !== 32) {
    throw new Error("PAYOUT_ENCRYPTION_KEY must be a 64-character hex value");
  }

  const [ivHex, authTagHex, encryptedHex] = encryptedValue.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");

  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
};

const encryptPayoutDetails = (payoutDetails) => ({
  encrypted: encryptSecret(payoutDetails),
});

const updatePayoutDetails = async (organizationId, payoutDetails, requesterId) => {
  const organization = await Organization.findOne({
    _id: organizationId,
    members: {
      $elemMatch: {
        userId: requesterId,
        role: "owner",
      },
    },
  }).select("+payoutDetails.encrypted");

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  organization.payoutDetails = encryptPayoutDetails(payoutDetails);
  await organization.save();
  return organization;
};

const getPayoutDetails = async (organizationId, requesterId) => {
  const organization = await Organization.findOne({
    _id: organizationId,
    members: {
      $elemMatch: {
        userId: requesterId,
        role: "owner",
      },
    },
  }).select("+payoutDetails.encrypted");

  if (!organization?.payoutDetails?.encrypted) {
    throw new ApiError(404, "Payout details not found");
  }

  return decryptPayoutDetails(organization.payoutDetails.encrypted);
};

module.exports = {
  encryptPayoutDetails,
  updatePayoutDetails,
  getPayoutDetails,
};
