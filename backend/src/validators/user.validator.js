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

const changePasswordSchema = z.object({
    currentPassword:z.string().min(1,"currentPassword is required"),
    newPassword:z.string().min(8,"newPassword must be at least 8 characters"),
}).refine(
    (data) => data.newPassword !== data.currentPassword,
    { message: "newPassword must be different from currentPassword", path:["newPassword"] }
)

module.exports = { updateProfileSchema, changePasswordSchema };