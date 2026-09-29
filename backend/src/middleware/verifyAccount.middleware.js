const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma.js");
const { hashInviteToken } = require("../utils/secret.utils.js");

const verifyAccount = async (req, res, next) => {
  try {
    const invite = await prisma.invite.findFirst({
      where: {
        tokenHash: hashInviteToken(req.params.token),
        status: "pending",
      },
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
      req.user = { id: payload.sub, role: payload.role, accountExists: true };
    }
    return next();
  } catch (err) {
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
