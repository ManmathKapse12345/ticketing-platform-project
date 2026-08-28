const mongoose = require("mongoose");
const dbHandler = require("./dbHandler");
const Organization = require("../src/models/0003_organizer.model.js");
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
    const userId = new mongoose.Types.ObjectId();
    await Organization.create({
      name: "Viewer Org",
      members: [{ userId, role: "viewer" }],
    });
    await Organization.create({
      name: "Owner Org",
      members: [{ userId, role: "owner" }],
    });
    await Organization.create({
      name: "Unrelated Org",
      members: [{ userId: new mongoose.Types.ObjectId(), role: "owner" }],
    });

    const orgs = await getOrganizationByMemberId(userId);
    expect(orgs).toHaveLength(2);
  });

  it("throws 404 when the user is a member of nothing", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(getOrganizationByMemberId(userId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateOrganizationById", () => {
  it("updates name/branding but ignores any client-supplied payoutDetails", async () => {
    const org = await Organization.create({
      name: "Original Name",
      members: [],
    });

    const updated = await updateOrganizationById(org._id, {
      name: "New Name",
      branding: { primaryColor: "#000000" },
      payoutDetails: { encrypted: "attacker-controlled-value" },
    });

    expect(updated.name).toBe("New Name");
    expect(updated.branding.primaryColor).toBe("#000000");

    const raw = await Organization.findById(org._id).select("+payoutDetails.encrypted");
    expect(raw.payoutDetails?.encrypted).toBeUndefined();
  });
});
