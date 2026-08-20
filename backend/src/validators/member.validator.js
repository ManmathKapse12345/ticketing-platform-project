const { z } = require("zod");

const joiningRequestSchema = z.object({
    email:z.string().email(),
})

const bodySchema = z.object({
    name:z.string(),
    email:z.string().email(),
    password:z.string().min(8,"Password must be consists of atleasts 8 characters "),
    role:z.enum(["viewer","editor","admin"]).default("viewer"),
    companyName:z.string(),
})

module.exports = { bodySchema,joiningRequestSchema };