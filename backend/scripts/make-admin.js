// Gives an existing user the platform admin role. There's deliberately no
// endpoint for this: admin access is only ever granted from the database side.
//
//   npm run make-admin -- you@example.com
//
// Against the deployed database, set DATABASE_URL first (Render > ticketing-db >
// Connect > External Database URL). A DATABASE_URL already in the shell wins over .env.
require("dotenv").config({ quiet: true });
const prisma = require("../src/config/prisma.js");

const main = async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run make-admin -- <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}. Register in the app first.`);

  // Also verified: login requires it, and the verification email may not have arrived.
  await prisma.user.update({ where: { id: user.id }, data: { role: "platformAdmin", isVerified: true } });
  const host = new URL(process.env.DATABASE_URL).host;
  console.log(`${email} is now a platform admin (database: ${host}). Log out and back in to use /admin.`);
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
