const jwt = require("jsonwebtoken");
const Organization = require("../models/0003_organizer.model.js");


const requireOrganizationRole = (...allowedRoles) => {
    return async (req,res,next) => {
        try {
            const organization = await Organization.findById(req.params.organizationId).select("members");
            
            if(!organization){
                return res.status(404).json({
                    message:"Organization not found"
                })
            }

            const member = organization.members.find(
                item => item.userId.toString() === req.user._id.toString()
            );

            if(!member){
                return res.status(403).json({
                    message:"You are not a member of this organization"
                })
            }

            if(!allowedRoles.includes(member.role)){
                return res.status(403).json({
                    message: "Insufficient organization permission"
                })
            }

            req.organization = organization;
            req.organizationMember = member;

            return next();
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = requireOrganizationRole;