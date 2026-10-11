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

// Money the organization can be paid out right now, in minor units.
//   settled:  captured payments for events that have finished (refunds before the
//             event can't then exceed what was paid out), minus refunds already
//             reserved (refundedMinor includes in-flight ones) and platform fees.
//   reserved: payouts requested or already paid.
// `db` lets requestPayout run this inside its locked transaction.
const getPayoutBalance = async (organizationId, db = prisma) => {
  // Sequential, not Promise.all: inside an interactive transaction both queries
  // share one connection.
  const [{ settledMinor }] = await db.$queryRaw`
      SELECT COALESCE(SUM(GREATEST(p."amountMinor" - p."refundedMinor" - o."feesMinor", 0)), 0)
               AS "settledMinor"
      FROM "Payment" p
      JOIN "Order" o ON o.id = p."orderId"
      JOIN "Event" e ON e.id = o."eventId"
      WHERE p."organizationId" = ${organizationId}::uuid
        AND p.status IN ('SUCCESS', 'REFUNDED')
        AND COALESCE(e."endDate", e."startDate") < NOW()`;
  const reserved = await db.payout.aggregate({
    where: { organizationId, status: { in: ["REQUESTED", "PAID"] } },
    _sum: { amountMinor: true },
  });

  const settled = Number(settledMinor);
  const reservedMinor = reserved._sum.amountMinor ?? 0;
  return {
    settledMinor: settled,
    reservedMinor,
    availableMinor: Math.max(settled - reservedMinor, 0),
  };
};

// Requests the whole available balance. The organization row is locked so two
// concurrent requests can't both see the same balance and double-claim it.
const requestPayout = (organizationId, requesterId) =>
  prisma.$transaction(async (tx) => {
    const [organization] = await tx.$queryRaw`
      SELECT id, "verifiedAt", "payoutDetailsEncrypted" IS NOT NULL AS "hasPayoutDetails"
      FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
    if (!organization) throw new ApiError(404, "Organization not found");
    if (!organization.verifiedAt) {
      throw new ApiError(403, "Organization must be verified by the platform before payouts");
    }
    if (!organization.hasPayoutDetails) {
      throw new ApiError(409, "Add payout details before requesting a payout");
    }

    const { availableMinor } = await getPayoutBalance(organizationId, tx);
    if (availableMinor <= 0) throw new ApiError(409, "No balance available for payout");

    return tx.payout.create({
      data: { organizationId, amountMinor: availableMinor, requestedById: requesterId },
    });
  });

// Enough for the dashboard to show where money goes ("account ending 1234")
// without ever sending the full account number or UPI ID back.
const describePayoutDestination = (encryptedValue) => {
  if (!encryptedValue) return null;
  let details;
  try {
    details = decryptPayoutDetails(encryptedValue);
  } catch {
    return { method: "unreadable" }; // saved, but with a different key
  }
  if (details.method === "bank") {
    return {
      method: "bank",
      accountHolderName: details.accountHolderName,
      accountLast4: details.accountNumber.slice(-4),
      ifsc: details.ifsc,
    };
  }
  const [name, handle] = details.upiId.split("@");
  return { method: "upi", upiId: `${name.slice(0, 2)}•••@${handle}` };
};

const listOrganizationPayouts = async (organizationId) => {
  const [organization, balance, payouts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { verifiedAt: true, payoutDetailsEncrypted: true },
    }),
    getPayoutBalance(organizationId),
    prisma.payout.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!organization) throw new ApiError(404, "Organization not found");
  return {
    verified: !!organization.verifiedAt,
    destination: describePayoutDestination(organization.payoutDetailsEncrypted),
    balance,
    payouts,
  };
};

// Platform admin side.
const listAllPayouts = async ({ page, limit, status }) => {
  const where = status ? { status } : {};
  const [payouts, total] = await prisma.$transaction([
    prisma.payout.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { organization: { select: { id: true, name: true, payoutDetailsEncrypted: true } } },
    }),
    prisma.payout.count({ where }),
  ]);
  // Staff need the real account to send money, but only while a payout is waiting:
  // settled payouts don't need it, so they don't get it.
  const readDetails = (encryptedValue) => {
    try {
      return encryptedValue ? decryptPayoutDetails(encryptedValue) : null;
    } catch {
      return null;
    }
  };
  return {
    payouts: payouts.map(({ organization: { payoutDetailsEncrypted, ...organization }, ...payout }) => ({
      ...payout,
      organization,
      payoutDetails: payout.status === "REQUESTED" ? readDetails(payoutDetailsEncrypted) : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Only a REQUESTED payout can move, and only once: PAID or CANCELLED is final.
// Cancelling releases the amount back into the available balance.
const updatePayoutStatus = async (payoutId, { status, reference, note }) => {
  const { count } = await prisma.payout.updateMany({
    where: { id: payoutId, status: "REQUESTED" },
    data: { status, reference, note, processedAt: new Date() },
  });
  if (count === 0) {
    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new ApiError(404, "Payout not found");
    throw new ApiError(409, `Payout is already ${payout.status.toLowerCase()}`);
  }
  return prisma.payout.findUnique({ where: { id: payoutId } });
};

module.exports = {
  encryptPayoutDetails,
  updatePayoutDetails,
  getPayoutDetails,
  getPayoutBalance,
  requestPayout,
  listOrganizationPayouts,
  listAllPayouts,
  updatePayoutStatus,
};
