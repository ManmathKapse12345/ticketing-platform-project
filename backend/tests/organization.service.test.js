const prisma = require("../src/config/prisma.js");
const dbHandler = require("./dbHandler");
const { makeUser, makeOrganization } = require("./factories");
const {
  getOrganizationByMemberId,
  updateOrganizationById,
} = require("../src/services/organization.service.js");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("getOrganizationByMemberId", () => {
  it("finds organizations for a member regardless of their org-scoped role", async () => {
    const { id: userId } = await makeUser();
    const { id: otherUserId } = await makeUser();
    await makeOrganization({
      name: "Viewer Org",
      members: { create: { userId, role: "viewer" } },
    });
    await makeOrganization({
      name: "Owner Org",
      members: { create: { userId, role: "owner" } },
    });
    await makeOrganization({
      name: "Unrelated Org",
      members: { create: { userId: otherUserId, role: "owner" } },
    });

    const orgs = await getOrganizationByMemberId(userId);
    expect(orgs).toHaveLength(2);
  });

  it("throws 404 when the user is a member of nothing", async () => {
    const { id: userId } = await makeUser();
    await expect(getOrganizationByMemberId(userId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateOrganizationById", () => {
  it("updates name/branding but ignores any client-supplied payoutDetails", async () => {
    const org = await makeOrganization({ name: "Original Name" });

    const updated = await updateOrganizationById(org.id, {
      name: "New Name",
      branding: { primaryColor: "#000000" },
      payoutDetails: { encrypted: "attacker-controlled-value" },
    });

    expect(updated.name).toBe("New Name");
    expect(updated.primaryColor).toBe("#000000");
    expect(updated).not.toHaveProperty("payoutDetailsEncrypted"); // never returned to clients

    const raw = await prisma.organization.findUnique({
      where: { id: org.id },
      omit: { payoutDetailsEncrypted: false },
    });
    expect(raw.payoutDetailsEncrypted).toBeNull();
  });
});
