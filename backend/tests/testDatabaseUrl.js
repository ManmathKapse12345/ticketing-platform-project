// Tests run against a separate database so they never wipe dev data.
// Uses TEST_DATABASE_URL if set, otherwise DATABASE_URL with "_test" appended
// to the database name (e.g. .../ticketing -> .../ticketing_test).
const testDatabaseUrl = () => {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL or TEST_DATABASE_URL in .env to run the tests");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
};

module.exports = testDatabaseUrl;
