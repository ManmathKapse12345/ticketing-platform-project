// Checks the platform-level User.role from the JWT ("customer" | "platformAdmin") only.
// Org-scoped roles (owner/admin/editor/viewer) live in the OrganizationMember table and are never
// part of this token — use requireOrganizationRole (verifyOwner.middleware.js) for those.
const authorize = (...roles) => {
    return (req,res,next) => {
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Not authenticated"
            })
        }
        if(!req.user.role || 
            !roles.includes(
                req.user.role
            )
        ){
            return res.status(403).json({
                success:false,
                message:"You do not have permission to perform this action"
            });
        }

        next();
    };
};

module.exports = authorize;