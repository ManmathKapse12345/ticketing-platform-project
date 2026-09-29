const prisma = require("../src/config/prisma.js");

const connect = () => prisma.$connect();

const clearDatabase = async () => {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  const tableList = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
};

const closeDatabase = () => prisma.$disconnect();

module.exports = { connect, clearDatabase, closeDatabase };
