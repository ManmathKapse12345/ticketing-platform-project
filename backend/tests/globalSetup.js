const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const testDatabaseUrl = require("./testDatabaseUrl");

// Runs once before all test files: creates the test database if needed and applies
// any pending migrations. Tests empty the tables themselves (dbHandler.clearDatabase),
// so nothing here ever drops data.
module.exports = async () => {
  const url = testDatabaseUrl();

  // dbHandler truncates every table — make sure that can only ever hit a test database.
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error("Refusing to run tests against a database whose name does not end in _test");
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
};
