const crypto = require("crypto");

const getEncryptionKey = () => {
  const value = process.env.PAYOUT_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("PAYOUT_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(value, "hex");
  if (key.length !== 32) {
    throw new Error("PAYOUT_ENCRYPTION_KEY must be a 64-character hex value");
  }

  return key;
};

const encryptSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plaintext = typeof value === "string" ? value : JSON.stringify(value);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
};

const hashInviteToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = { encryptSecret, hashInviteToken };
