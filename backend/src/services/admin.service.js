const prisma = require("../config/prisma.js");
const ApiError = require("../utils/apiError.js");

const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const listOrganizations = async ({ page, limit, search, verified }) => {
  const where = {
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(verified !== undefined && { verifiedAt: verified ? { not: null } : null }),
  };

  const [organizations, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { members: true, events: true } } },
    }),
    prisma.organization.count({ where }),
  ]);

  return { organizations, pagination: paginate(page, limit, total) };
};

const setOrganizationVerification = async (organizationId, verified) => {
  const { count } = await prisma.organization.updateMany({
    where: { id: organizationId },
    data: { verifiedAt: verified ? new Date() : null },
  });
  if (count === 0) throw new ApiError(404, "Organization not found");
  return prisma.organization.findUnique({ where: { id: organizationId } });
};

const listUsers = async ({ page, limit, search, role }) => {
  const where = {
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        memberships: {
          select: { role: true, organization: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, pagination: paginate(page, limit, total) };
};

module.exports = { listOrganizations, setOrganizationVerification, listUsers };
