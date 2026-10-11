const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock("nodemailer", () => ({ createTransport: () => ({ sendMail: mockSendMail }) }));

const request = require("supertest");
const app = require("../app.js");
const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser } = require("./factories");

beforeAll(() => dbHandler.connect());
beforeEach(() => mockSendMail.mockClear());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

describe("validation", () => {
  it("rejects a reset with a malformed token or short password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password/not-a-token")
      .send({ newPassword: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects verify-email without a token", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/resend-verification", () => {
  it("issues a fresh token and emails an unverified user", async () => {
    const user = await makeUser({ verifyToken: "old", verifyTokenExpires: new Date(Date.now() - 1000) });

    const res = await request(app).post("/api/auth/resend-verification").send({ email: `  ${user.email.toUpperCase()} ` });

    expect(res.status).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated.verifyToken).not.toBe("old");
  });

  it("gives the same answer for an unknown email and sends nothing", async () => {
    const res = await request(app).post("/api/auth/resend-verification").send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("doesn't send a second email within the cooldown", async () => {
    const user = await makeUser();
    await request(app).post("/api/auth/resend-verification").send({ email: user.email });
    await request(app).post("/api/auth/resend-verification").send({ email: user.email });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/register", () => {
  it("still creates the account when the verification email can't be sent", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:587"));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "New User", email: "new.user@example.com", password: "Password123!" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(await prisma.user.findUnique({ where: { email: "new.user@example.com" } })).not.toBeNull();
  });
});
