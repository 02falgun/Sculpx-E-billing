import { z } from "zod";

export const loginBodySchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address format"),
    password: z.string().min(1, "Password is required").optional(),
    pinOrPassword: z.string().min(1, "Password is required").optional(),
  })
  .refine((data) => !!(data.password || data.pinOrPassword), {
    message: "Password is required (either 'password' or 'pinOrPassword')",
    path: ["password"],
  });

export type LoginInput = z.infer<typeof loginBodySchema>;
