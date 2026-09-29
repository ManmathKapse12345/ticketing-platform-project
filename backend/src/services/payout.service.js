const prisma = require("../config/prisma.js");
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

// Returns the "iv.authTag.ciphertext" string stored in Organization.payoutDetailsEncrypted
const encryptPayoutDetails = (payoutDetails) => encryptSecret(payoutDetails);

const findOrganizationOwnedBy = (organizationId, requesterId) =>
  prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: { some: { userId: requesterId, role: "owner" } },
    },
    omit: { payoutDetailsEncrypted: false },
  });

const updatePayoutDetails = async (organizationId, payoutDetails, requesterId) => {
  const organization = await findOrganizationOwnedBy(organizationId, requesterId);

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  return prisma.organization.update({
    where: { id: organization.id },
    data: { payoutDetailsEncrypted: encryptPayoutDetails(payoutDetails) },
  });
};

const getPayoutDetails = async (organizationId, requesterId) => {
  const organization = await findOrganizationOwnedBy(organizationId, requesterId);

  if (!organization?.payoutDetailsEncrypted) {
    throw new ApiError(404, "Payout details not found");
  }

  return decryptPayoutDetails(organization.payoutDetailsEncrypted);
};

module.exports = {
  encryptPayoutDetails,
  updatePayoutDetails,
  getPayoutDetails,
};
