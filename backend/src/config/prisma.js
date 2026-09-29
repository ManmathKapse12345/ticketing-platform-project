const { PrismaClient } = require("@prisma/client");

// Secrets are left out of every query result by default so they can't leak into an
// API response by accident. A query that genuinely needs one opts back in with
// e.g. `omit: { password: false }`.
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    omit: {
        user: {
            password: true,
            verifyToken: true,
            verifyTokenExpires: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
        },
        organization: {
            payoutDetailsEncrypted: true,
        },
    },
});

module.exports = prisma;
