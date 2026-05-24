const { z } = require('zod');

const loginSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters long")
    .max(100, "Username is too long")
    .trim(),
  password: z.string()
    .min(1, "Password is required")
    .max(255, "Password is too long"),
  schoolSlug: z.string().trim().optional().nullable()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(6, "New password must be at least 6 characters long")
    .max(100, "New password is too long")
});

const resetPasswordSchema = z.object({
  userId: z.union([z.string(), z.number()]).transform((val) => parseInt(val, 10)),
  newPassword: z.string()
    .min(6, "New password must be at least 6 characters long")
    .max(100, "New password is too long")
});

const identifySchema = z.object({
  identifier: z.string().min(1, "Username or Email is required").trim(),
  schoolSlug: z.string().trim().optional().nullable()
});

module.exports = {
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  identifySchema
};
