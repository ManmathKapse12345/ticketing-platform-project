const User = require("../models/0001_user.model");
const Organization = require("../models/0003_organizer.model.js");
const Invite = require("../models/0011_inviteSchema.model.js");
const crypto = require("crypto");
const { hashPassword, sendEmail, generateVerificationToken } = require("../utils/auth.utils.js");
const { hashInviteToken, encryptSecret } = require("../utils/secret.utils.js");
const mongoose = require("mongoose");
const ApiError = require("../utils/apiError.js");

// InviteError extends Error{
//   constructor(message,status){
//     super(message);
//     this.status=status;
//   }
// }

const inviteMember = async (email, organizationId, role, invitedBy) => {
  const normalizedEmail = email.toLowerCase();
  const organization = await Organization.findOne({
    _id: organizationId,
    members: {
      $elemMatch: {
        userId: invitedBy,
        role: "owner",
      },
    },
  });
  if (!organization) throw new ApiError(404, "Organization not found");

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const alreadyMember = organization.members.some(
      (m) => m.userId.toString() === existingUser._id.toString(),
    );
    if (alreadyMember) {
      throw new ApiError(409, "User is already a member of this organization");
    }
  }
  const token = crypto.randomBytes(32).toString("hex");
  const invite = await Invite.create({
    email: normalizedEmail,
    organizationId: organizationId,
    role: role,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(
      Date.now() + Number(process.env.INVITE_EXPIRY_DAYS) * 24 * 60 * 60 * 1000,
    ),
    invitedBy: invitedBy,
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
  const invite = await Invite.findOne({
    tokenHash: hashInviteToken(token),
    status: "pending",
  });
  if (!invite || invite.expiresAt < new Date()) {
    throw new ApiError(410, "Invite is invalid or has expired");
  }
  const user = await User.findById(requestingUser._id);
  // console.log("invite.email : ",invite.email);
  // console.log("user.email.toLowerCase() : ",user.email.toLowerCase());
  if (invite.email !== user.email.toLowerCase()) {
    throw new ApiError(403, "This invite was not issued to your account");
  }
  // user.role = invite.role;
  // await user.save();

  const organization = await Organization.findOneAndUpdate(
    { _id: invite.organizationId, "members.userId": { $ne: user._id } },
    { $push: { members: { userId: user._id, role: invite.role } } },
    { new: true },
  );

  if (!organization) {
    throw new ApiError(409, "You are already a member of this organization");
  }

  invite.status = "accepted";
  await invite.save();

  return organization;
};

const registerAndAcceptInvite = async (token, name, password) => {
  const invite = await Invite.findOne({
    tokenHash: hashInviteToken(token),
    status: "pending",
  });
  if (!invite || invite.expiresAt < new Date()) {
    throw new ApiError(410, "Invite is invalid or has expired");
  }

  const existingUser = await User.findOne({ email: invite.email });
  if (existingUser) {
    throw new ApiError(409, "Account already exists, please log in instead");
  }

  const hashedPassword = await hashPassword(password);
  const { rawToken, hashedToken } = generateVerificationToken();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [user] = await User.create(
      [
        {
          name,
          email: invite.email,
          password: hashedPassword,
          role: "customer",
          verifyToken: hashedToken,
          verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
        },
      ],
      { session },
    );

    const organization = await Organization.findOneAndUpdate(
      { _id: invite.organizationId },
      { $push: { members: { userId: user._id, role: invite.role } } },
      { new: true, session },
    );

    if (!organization) throw new ApiError(404, "Organization no longer exists");

    invite.status = "accepted";
    await invite.save({ session });

    await session.commitTransaction();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    return { user, organization, verifyUrl };
  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(err.statusCode, err.message);
  } finally {
    session.endSession();
  }
};

const removeMember = async (organizationId, memberId, requesterId) => {
  const organization = await Organization.findOne({
    _id: organizationId,
    members: {
      $elemMatch: {
        userId: requesterId,
        role: "owner",
      },
    },
  });

  if (!organization) {
    throw new ApiError(
      403,
      "Organization not found or requester is not an owner",
    );
  }

  const member = organization.members.find(
    (item) => item.userId.toString() === memberId.toString(),
  );

  if (!member) {
    throw new ApiError(404, "Member not found ");
  }

  if (member.userId.toString() === requesterId.toString()) {
    throw new ApiError(400, "Owner cannot remove themselves");
  }

  const ownerCount = organization.members.filter(
    (item) => item.role === "owner",
  ).length;

  if (member.role === "owner" && ownerCount === 1) {
    throw new ApiError(400, "The last owner cannot be removed");
  }

  const updatedOrganization = await Organization.findOneAndUpdate(
    {
      _id: organizationId,
      "members.userId": memberId,
    },
    {
      $pull: {
        members: {
          userId: memberId,
        },
      },
    },
    {
      new: true,
    },
  );

  if (!updatedOrganization) {
    throw new ApiError(404, "Member could not be removed");
  }

  return updatedOrganization;

  // const organization = await Organization.findOneAndUpdate(
  //   { _id: organizationId },
  //   { $pull: { members: { userId: memberId } } },
  //   { new: true },
  // );

  // const user = await User.findById(memberId);
  // if (!user) {
  //   throw new ApiError(404, "User not found");
  // }

  // if (!organization) throw new ApiError(404, "Organization not found");

  // return organization;
};

const updateMemberRole = async (
  organizationId,
  memberId,
  newRole,
  requesterId,
) => {
  const organization = await Organization.findOne({
    _id: organizationId,
    members: {
      $elemMatch: {
        userId: requesterId,
        role: "owner",
      },
    },
  });

  if (!organization) {
    throw new ApiError(
      403,
      "Organization not found or requester is not the owner",
    );
  }

  if (memberId === requesterId.toString()) {
    throw new ApiError(400, "Owner cannot change their own role");
  }

  const updateOrganization = await Organization.findOneAndUpdate(
    {
      _id: organizationId,
      "members.userId": memberId,
    },
    {
      $set: {
        "members.$.role": newRole,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updateOrganization) {
    throw new ApiError(404, "Member not found ");
  }

  return updateOrganization;
};

const getOrganizationById = async (organizationId) => {
  const organization = await Organization.findById(organizationId);
  if(!organization){
    throw new ApiError(404, "Organization not found");
  }
  return organization;
};

const getOrganizationByMemberId = async (memberId) => {
  const organization = await Organization.find({
    "members.userId": memberId,
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
    ...(branding !== undefined && { branding }),
  }
  if(Object.keys(setFields).length === 0){ 
    throw new ApiError(400, "No fields provided to update");
  }
  const updated = await Organization.findByIdAndUpdate(
    organizationId,
    { $set: setFields },
    { new: true, runValidators: true},
  );

  if(!updated)  throw new ApiError(404,"Organization not found");
  return updated;
}

const getAllMembersByOrganizationId = async(organizationId) => {
  const organization = await Organization.findById(organizationId);
  if(!organization){
    throw new ApiError(400,"No Organization were found");
  }
  const members = organization.members;
  if(!members){
    throw new ApiError(400,"No members of organization were found");
  }
  return members;
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
