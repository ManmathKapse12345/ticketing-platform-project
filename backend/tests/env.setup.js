const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const testDatabaseUrl = require("./testDatabaseUrl");

// Point Prisma at the test database before any test file creates a client.
process.env.DATABASE_URL = testDatabaseUrl();
// Never push jobs into the developer's real Redis from tests.
process.env.JOB_QUEUE_DISABLED = "true";
// Keep generated PDFs out of the real storage folder.
process.env.TICKET_PDF_DIR = path.join(require("os").tmpdir(), "ticketing-test-pdfs");
