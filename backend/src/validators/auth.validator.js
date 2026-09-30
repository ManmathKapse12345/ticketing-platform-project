const { z } = require("zod");

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
// Verify and reset tokens are crypto.randomBytes(32) as hex.
const token = z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired token");
// bcrypt ignores anything past 72 bytes.
const password = z.string().min(8, "Password must be at least 8 characters").max(72);

const forgotPasswordSchema = { body: z.object({ email }) };
const resendVerificationSchema = { body: z.object({ email }) };
const verifyEmailSchema = { body: z.object({ token }) };
const resetPasswordSchema = {
  params: z.object({ token }),
  body: z.object({ newPassword: password }),
};

const validateRegister = (data) => {
  const { name, email, password, role, companyName, branding, payoutDetails } =
    data;
  if (!name) {
    throw new Error("Name is required");
  }
  if (!email) {
    throw new Error("Email is required");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be atleast 8 character");
  }
  if (role && !companyName) {
    throw new Error("Company Name is required");
  }
  if (role && !branding) {
    throw new Error("Branding is required");
  }
  if (role && !payoutDetails) {
    throw new Error("Payout Details is required");
  }
};

const validateLogin = (data) => {
  const { email, password } = data;
  if (!email) {
    throw new Error("Email is required");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be atleast 8 character");
  }
};

module.exports = {
  validateRegister,
  validateLogin,
  forgotPasswordSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  resetPasswordSchema,
};
