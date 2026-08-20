const { z } = require("zod");

const updateProfileSchema = z.object({
    name:z.string().min(1).max(100).optional(),
    email:z.string().optional(),
    currentPassword:z.string().optional(),
    newPassword:z.string().min(8).optional(),
}).refine(
    (data) => !data.newPassword || data.currentPassword,
    { message: "currentPassword is required to set a new Password" }
)

module.exports = updateProfileSchema;