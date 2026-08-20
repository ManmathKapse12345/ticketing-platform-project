const crypto = require("crypto");

const getQrSecret = () => {
  if (!process.env.QR_SECRET) {
    throw new Error("QR_SECRET is not configured");
  }
  return process.env.QR_SECRET;
};

const encode = (value) => Buffer.from(value).toString("base64url");
const decode = (value) => Buffer.from(value, "base64url").toString("utf8");

const signTicketQr = ({ ticketId, eventId, expiresAt }) => {
  const payload = encode(
    JSON.stringify({
      ticketId,
      eventId,
      expiresAt: new Date(expiresAt).toISOString(),
    }),
  );
  const signature = crypto
    .createHmac("sha256", getQrSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const verifyTicketQr = (value) => {
  const [payload, signature] = String(value).split(".");
  if (!payload || !signature) {
    throw new Error("Invalid QR payload");
  }

  const expected = crypto
    .createHmac("sha256", getQrSecret())
    .update(payload)
    .digest("base64url");
  const receivedSignature = Buffer.from(signature);
  const expectedSignature = Buffer.from(expected);
  const signaturesMatch =
    receivedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(receivedSignature, expectedSignature);
  if (!signaturesMatch) {
    throw new Error("Invalid QR signature");
  }

  const decoded = JSON.parse(decode(payload));
  if (
    !decoded.ticketId ||
    !decoded.eventId ||
    new Date(decoded.expiresAt) <= new Date()
  ) {
    throw new Error("QR payload is expired or incomplete");
  }

  return decoded;
};

module.exports = { signTicketQr, verifyTicketQr };
