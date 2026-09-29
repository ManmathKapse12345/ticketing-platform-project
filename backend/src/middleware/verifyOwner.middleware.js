const prisma = require("../config/prisma.js");


const requireOrganizationRole = (...allowedRoles) => {
    return async (req,res,next) => {
        try {
            const { organizationId } = req.params;
            const member = await prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: { organizationId, userId: req.user.id },
                },
                include: { organization: true },
            });

            if(!member){
                const organization = await prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { id: true },
                });
                if(!organization){
                    return res.status(404).json({
                        message:"Organization not found"
                    })
                }
                return res.status(403).json({
                    message:"You are not a member of this organization"
                })
            }

            if(!allowedRoles.includes(member.role)){
                return res.status(403).json({
                    message: "Insufficient organization permission"
                })
            }

            const { organization, ...membership } = member;
            req.organization = organization;
            req.organizationMember = membership;

            return next();
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = requireOrganizationRole;
