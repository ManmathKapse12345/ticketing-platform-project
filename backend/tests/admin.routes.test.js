const request = require("supertest");
const app = require("../app.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeOrganization } = require("./factories");
const { generateToken } = require("../src/utils/auth.utils.js");

beforeAll(() => dbHandler.connect());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

const asUser = async (user) => `Bearer ${(await generateToken(user)).accessToken}`;
const makeAdmin = () => makeUser({ role: "platformAdmin" });

describe("platform admin access", () => {
  it("rejects customers and anonymous callers", async () => {
    const customer = await makeUser();

    expect((await request(app).get("/api/admin/users")).status).toBe(401);
    const res = await request(app).get("/api/admin/users").set("Authorization", await asUser(customer));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/organizations", () => {
  it("paginates and filters by verification status", async () => {
    const admin = await makeAdmin();
    await makeOrganization({ name: "Verified Co", verifiedAt: new Date() });
    await makeOrganization({ name: "Pending Co" });

    const res = await request(app)
      .get("/api/admin/organizations?verified=false")
      .set("Authorization", await asUser(admin));

    expect(res.status).toBe(200);
    expect(res.body.organizations.map((o) => o.name)).toEqual(["Pending Co"]);
    expect(res.body.organizations[0]).not.toHaveProperty("payoutDetailsEncrypted");
    expect(res.body.pagination).toMatchObject({ page: 1, total: 1 });
  });
});

describe("PATCH /api/admin/organizations/:id/verification", () => {
  it("verifies and un-verifies an organization", async () => {
    const admin = await makeAdmin();
    const org = await makeOrganization();
    const auth = await asUser(admin);

    let res = await request(app)
      .patch(`/api/admin/organizations/${org.id}/verification`)
      .set("Authorization", auth)
      .send({ verified: true });
    expect(res.status).toBe(200);
    expect(res.body.organization.verifiedAt).not.toBeNull();

    res = await request(app)
      .patch(`/api/admin/organizations/${org.id}/verification`)
      .set("Authorization", auth)
      .send({ verified: false });
    expect(res.body.organization.verifiedAt).toBeNull();
  });

  it("400s on a bad body and 404s on an unknown organization", async () => {
    const auth = await asUser(await makeAdmin());
    const org = await makeOrganization();

    const bad = await request(app)
      .patch(`/api/admin/organizations/${org.id}/verification`)
      .set("Authorization", auth)
      .send({ verified: "yes" });
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .patch("/api/admin/organizations/00000000-0000-4000-8000-000000000000/verification")
      .set("Authorization", auth)
      .send({ verified: true });
    expect(missing.status).toBe(404);
  });
});

describe("GET /api/admin/users", () => {
  it("searches by email and never returns password hashes", async () => {
    const admin = await makeAdmin();
    await makeUser({ email: "findme@example.com" });
    await makeUser();

    const res = await request(app)
      .get("/api/admin/users?search=FINDME")
      .set("Authorization", await asUser(admin));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].email).toBe("findme@example.com");
    expect(res.body.users[0]).not.toHaveProperty("password");
  });
});

describe("GET /health", () => {
  it("reports the database as up", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "up" });
  });
});
