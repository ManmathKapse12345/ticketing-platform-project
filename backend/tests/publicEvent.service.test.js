const dbHandler = require("./dbHandler");
const { makeEvent, makeOrganization } = require("./factories");
const { listPublishedEvents } = require("../src/services/publicEvent.service.js");

beforeAll(() => dbHandler.connect());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

const inDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
const query = (overrides = {}) => ({ page: 1, limit: 20, ...overrides });

describe("listPublishedEvents", () => {
  it("returns only upcoming published events", async () => {
    const { id: organizationId } = await makeOrganization();
    await makeEvent({ organizationId, title: "Upcoming", startDate: inDays(5) });
    await makeEvent({ organizationId, title: "Past", startDate: inDays(-5) });
    await makeEvent({ organizationId, title: "Draft", status: "DRAFT" });

    const { events } = await listPublishedEvents(query());
    expect(events.map((e) => e.title)).toEqual(["Upcoming"]);
  });

  it("paginates in start-date order", async () => {
    const { id: organizationId } = await makeOrganization();
    for (let i = 1; i <= 5; i++) {
      await makeEvent({ organizationId, title: `E${i}`, startDate: inDays(i) });
    }

    const { events, pagination } = await listPublishedEvents(query({ page: 2, limit: 2 }));
    expect(events.map((e) => e.title)).toEqual(["E3", "E4"]);
    expect(pagination).toMatchObject({ total: 5, totalPages: 3 });
  });

  it("filters by date range and case-insensitive search", async () => {
    const { id: organizationId } = await makeOrganization();
    await makeEvent({ organizationId, title: "Jazz Night", startDate: inDays(3) });
    await makeEvent({ organizationId, title: "jazz brunch", startDate: inDays(30) });
    await makeEvent({ organizationId, title: "Rock Show", startDate: inDays(3) });

    const { events } = await listPublishedEvents(query({ search: "JAZZ", to: inDays(10) }));
    expect(events.map((e) => e.title)).toEqual(["Jazz Night"]);
  });
});
