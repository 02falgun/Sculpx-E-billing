import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid staff email address"),
  pinOrPassword: z.string().min(4, "Password or PIN must be at least 4 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
