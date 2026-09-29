const { Prisma } = require("@prisma/client");

const hasCode = (err, code) =>
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

// P2002: unique constraint violated (Mongo's duplicate key error 11000)
const isUniqueViolation = (err) => hasCode(err, "P2002");

// P2025: the record to update/delete does not exist
const isNotFound = (err) => hasCode(err, "P2025");

// P2003: foreign key constraint violated (row is still referenced, or parent is missing)
const isForeignKeyViolation = (err) => hasCode(err, "P2003");

module.exports = { isUniqueViolation, isNotFound, isForeignKeyViolation };
