const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const testDatabaseUrl = require("./testDatabaseUrl");

// Point Prisma at the test database before any test file creates a client.
process.env.DATABASE_URL = testDatabaseUrl();
