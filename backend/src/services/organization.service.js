const crypto = require("crypto");
const prisma = require("../config/prisma.js");
const { hashPassword, sendEmail, generateVerificationToken } = require("../utils/auth.utils.js");
const { hashInviteToken } = require("../utils/secret.utils.js");
const { isUniqueViolation, isNotFound } = require("../utils/prisma.utils.js");
const ApiError = require("../utils/apiError.js");

const memberKey = (organizationId, userId) => ({
  organizationId_userId: { organizationId, userId },
});

const findOrganizationWithMembers = (organizationId, db = prisma) =>
  db.organization.findUnique({
    where: { id: organizationId },
    include: { members: true },
  });

const assertRequesterIsOwner = async (organizationId, requesterId, message) => {
  const requester = await prisma.organizationMember.findUnique({
    where: memberKey(organizationId, requesterId),
  });
  if (!requester || requester.role !== "owner") {
    throw new ApiError(403, message);
  }
};

const findPendingInvite = async (token) => {
  const invite = await prisma.invite.findFirst({
    where: { tokenHash: hashInviteToken(token), status: "pending" },
  });
  if (!invite || invite.expiresAt < new Date()) {
    throw new ApiError(410, "Invite is invalid or has expired");
  }
  return invite;
};

// Marks the invite accepted only if it is still pending, so the same link
// can't be redeemed twice by concurrent requests.
const claimInvite = async (tx, inviteId) => {
  const { count } = await tx.invite.updateMany({
    where: { id: inviteId, status: "pending" },
    data: { status: "accepted" },
  });
  if (count === 0) {
    throw new ApiError(410, "Invite is invalid or has expired");
  }
};

const inviteMember = async (email, organizationId, role, invitedBy) => {
  const normalizedEmail = email.trim().toLowerCase();
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: { some: { userId: invitedBy, role: "owner" } },
    },
  });
  if (!organization) throw new ApiError(404, "Organization not found");

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const alreadyMember = await prisma.organizationMember.findUnique({
      where: memberKey(organizationId, existingUser.id),
    });
    if (alreadyMember) {
      throw new ApiError(409, "User is already a member of this organization");
    }
  }
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.invite.create({
    data: {
      email: normalizedEmail,
      organizationId,
      role,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(
        Date.now() + Number(process.env.INVITE_EXPIRY_DAYS) * 24 * 60 * 60 * 1000,
      ),
      invitedById: invitedBy,
    },
  });
  const joiningUrl = existingUser
    ? `${process.env.FRONTEND_URL}/invite/${token}/accept`
    : `${process.env.FRONTEND_URL}/invite/${token}/register`;
  await sendEmail(
    normalizedEmail,
    "You've been invited to join an organization",
    `<p>You've been invited to join <b>${organization.name}</b> as <b>${role}</b>.</p>
     <p>Click <a href="${joiningUrl}">here</a> to ${existingUser ? "accept the invite" : "create your account and join"}.</p>`,
  );
  return joiningUrl;
};

const acceptInviteForExistingUser = async (token, requestingUser) => {
  const invite = await findPendingInvite(token);

  const user = requestingUser.id
    ? await prisma.user.findUnique({ where: { id: requestingUser.id } })
    : null;
  if (!user || invite.email !== user.email.toLowerCase()) {
    throw new ApiError(403, "This invite was not issued to your account");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await claimInvite(tx, invite.id);
      await tx.organizationMember.create({
        data: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
      });
      return findOrganizationWithMembers(invite.organizationId, tx);
    });
  } catch (err) {
    // Composite primary key (organizationId, userId) already exists
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "You are already a member of this organization");
    }
    throw err;
  }
};

const registerAndAcceptInvite = async (token, name, password) => {
  const invite = await findPendingInvite(token);

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new ApiError(409, "Account already exists, please log in instead");
  }

  const hashedPassword = await hashPassword(password);
  const { rawToken, hashedToken } = generateVerificationToken();

  try {
    const { user, organization } = await prisma.$transaction(async (tx) => {
      await claimInvite(tx, invite.id);

      const user = await tx.user.create({
        data: {
          name,
          email: invite.email,
          password: hashedPassword,
          role: "customer",
          verifyToken: hashedToken,
          verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          memberships: {
            create: { organizationId: invite.organizationId, role: invite.role },
          },
        },
      });

      const organization = await findOrganizationWithMembers(invite.organizationId, tx);
      return { user, organization };
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    return { user, organization, verifyUrl };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "Account already exists, please log in instead");
    }
    throw err;
  }
};

const removeMember = async (organizationId, memberId, requesterId) => {
  await assertRequesterIsOwner(
    organizationId,
    requesterId,
    "Organization not found or requester is not an owner",
  );

  if (memberId === requesterId) {
    throw new ApiError(400, "Owner cannot remove themselves");
  }

  const member = await prisma.organizationMember.findUnique({
    where: memberKey(organizationId, memberId),
  });

  if (!member) {
    throw new ApiError(404, "Member not found ");
  }

  if (member.role === "owner") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId, role: "owner" },
    });
    if (ownerCount === 1) {
      throw new ApiError(400, "The last owner cannot be removed");
    }
  }

  try {
    await prisma.organizationMember.delete({ where: memberKey(organizationId, memberId) });
  } catch (err) {
    if (isNotFound(err)) throw new ApiError(404, "Member could not be removed");
    throw err;
  }

  return findOrganizationWithMembers(organizationId);
};

const updateMemberRole = async (
  organizationId,
  memberId,
  newRole,
  requesterId,
) => {
  await assertRequesterIsOwner(
    organizationId,
    requesterId,
    "Organization not found or requester is not the owner",
  );

  if (memberId === requesterId) {
    throw new ApiError(400, "Owner cannot change their own role");
  }

  const { count } = await prisma.organizationMember.updateMany({
    where: { organizationId, userId: memberId },
    data: { role: newRole },
  });

  if (count === 0) {
    throw new ApiError(404, "Member not found ");
  }

  return findOrganizationWithMembers(organizationId);
};

const getOrganizationById = async (organizationId) => {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if(!organization){
    throw new ApiError(404, "Organization not found");
  }
  return organization;
};

const getOrganizationByMemberId = async (memberId) => {
  const organization = await prisma.organization.findMany({
    where: { members: { some: { userId: memberId } } },
  });
  if(organization.length === 0){
    throw new ApiError(404,"No organization found for this member");
  }
  return organization;
};

const updateOrganizationById = async(organizationId,data) => {
  // payoutDetails is intentionally excluded here — it must only ever be written
  // through payout.service.js's encrypt-on-write flow, never as raw client input.
  const { name, branding } = data;
  const setFields = {
    ...(name !== undefined && { name }),
    ...(branding?.logoUrl !== undefined && { logoUrl: branding.logoUrl }),
    ...(branding?.primaryColor !== undefined && { primaryColor: branding.primaryColor }),
  }
  if(Object.keys(setFields).length === 0){
    throw new ApiError(400, "No fields provided to update");
  }

  try {
    return await prisma.organization.update({
      where: { id: organizationId },
      data: setFields,
    });
  } catch (err) {
    if (isNotFound(err)) throw new ApiError(404,"Organization not found");
    if (isUniqueViolation(err)) throw new ApiError(409,"An organization with this name already exists");
    throw err;
  }
}

const getAllMembersByOrganizationId = async(organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if(!organization){
    throw new ApiError(400,"No Organization were found");
  }
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
}

module.exports = {
  inviteMember,
  acceptInviteForExistingUser,
  registerAndAcceptInvite,
  removeMember,
  updateMemberRole,
  getOrganizationById,
  getOrganizationByMemberId,
  updateOrganizationById,
  getAllMembersByOrganizationId
};
