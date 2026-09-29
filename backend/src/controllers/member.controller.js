const {
  inviteMember,
  acceptInviteForExistingUser,
  registerAndAcceptInvite,
  removeMember,
  updateMemberRole,
} = require("../services/organization.service");

const { saveRefreshToken } = require("../services/auth.service.js");
const ApiError = require("../utils/apiError");
const { generateToken, sendEmail } = require("../utils/auth.utils.js");

const inviteMemberRequest = async (req, res, next) => {
  try {
    const { email, memberRole } = req.body;
    const { organizationId } = req.params;

    if (!email || !memberRole) {
      throw new ApiError(422, "email and role are required");
    }

    const allowedRoles = ["viewer", "editor", "admin"];
    if (!allowedRoles.includes(memberRole)) {
      throw new ApiError(400, "This is not role allowed");
    }
    await inviteMember(email, organizationId, memberRole, req.user.id);
    return res.status(201).json({ message: "Invite sent successfully" });
  } catch (error) {
    return next(error);
  }
};

const removeMemberRequest = async (req, res, next) => {
  try {
    const { organizationId, memberId } = req.params;
    const organization = await removeMember(
      organizationId,
      memberId,
      req.user.id,
    );
    return res.status(200).json({ message: "Member removed", organization });
  } catch (error) {
    return next(error);
  }
};

const updateRoleRequest = async (req, res, next) => {
  try {
    const { organizationId, memberId } = req.params;
    const { newRole } = req.body;
    const requesterId = req.user.id;
    const allowedRoles = ["viewer", "editor", "admin"];
    if (!allowedRoles.includes(newRole)) {
      throw new ApiError(400, "This is not role allowed");
    }
    const updatedOrganization = await updateMemberRole(
      organizationId,
      memberId,
      newRole,
      requesterId,
    );

    return res.status(201).json({
      message: "Member Role update successfully",
    });
  } catch (error) {
    next(error);
  }
};

const registerNewInviteUser = async (req, res, next) => {
  try{
    const { name, password } = req.body;
    const { token } = req.params;
    if (!name || !password || password.length < 8) {
      throw new ApiError(422, "name and a password (min 8 chars) are required");
    }
    const { user, organization, verifyUrl } = await registerAndAcceptInvite(
      token,
      name,
      password,
    );

    const { accessToken, refreshToken, jti } = await generateToken(user);
    await saveRefreshToken(jti, user.id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    await sendEmail(
      user.email,
      "Verify your email",
      `<p>Click below to verify your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>`,
    );

    // password and token fields are already omitted by the Prisma client (config/prisma.js)
    return res
      .status(201)
      .json({ user, organization, accessToken });
  }catch(error){
    next(error);
  }
};

const acceptExistingInvite = async (req, res, next) => {
  try{    
    const organization = await acceptInviteForExistingUser(
      req.params.token,
      req.user,
    );
    return res.status(200).json({ message: "Joined organization", organization });
  }catch(error){
    next(error);
  }
};

module.exports = {
  inviteMemberRequest,
  removeMemberRequest,
  updateRoleRequest,
  registerNewInviteUser,
  acceptExistingInvite,
};
