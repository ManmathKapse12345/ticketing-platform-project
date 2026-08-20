const jwt = require("jsonwebtoken");
const Invite = require("../models/0011_inviteSchema.model.js");
const { hashInviteToken } = require("../utils/secret.utils.js");

const verifyAccount = async (req, res, next) => {
  try {
    const invite = await Invite.findOne({
      tokenHash: hashInviteToken(req.params.token),
      status: "pending",
    });
    if (!invite || invite.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: "Invite is invalid or has expired",
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    if (!token) {
      req.user = { accountExists: false, role: invite.role };
    } else {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { _id: payload.sub, role: payload.role, accountExists: true };
      console.log("req.user :- ", req.user);
    }
    return next();
  } catch (err) {
    console.log("error :- ", err);
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    return next(err);
  }
};

module.exports = verifyAccount;
