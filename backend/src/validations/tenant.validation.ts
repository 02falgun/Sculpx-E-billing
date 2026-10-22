import { z } from "zod";

export const onboardHotelSchema = z.object({
  name: z.string().min(2, "Hotel name must be at least 2 characters").max(255),
  code: z
    .string()
    .min(2, "Tenant code must be at least 2 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9-]+$/, "Tenant code must contain only letters, numbers, and hyphens"),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  gstin: z.string().optional().nullable(),
  cgstRate: z.coerce.number().min(0).max(100).default(2.5),
  sgstRate: z.coerce.number().min(0).max(100).default(2.5),
  serviceChargeRate: z.coerce.number().min(0).max(100).default(5.0),
  hasAccommodation: z.boolean().default(true),
  hasRestaurant: z.boolean().default(true),
  adminName: z.string().min(2, "Administrator name is required").max(255),
  adminEmail: z.string().email("Invalid administrator email"),
  adminPassword: z.string().min(8, "Administrator password must be at least 8 characters"),
  adminPhone: z.string().optional().nullable(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  gstin: z.string().optional().nullable(),
  cgstRate: z.coerce.number().min(0).max(100).optional(),
  sgstRate: z.coerce.number().min(0).max(100).optional(),
  serviceChargeRate: z.coerce.number().min(0).max(100).optional(),
  hasAccommodation: z.boolean().optional(),
  hasRestaurant: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export type OnboardHotelInput = z.infer<typeof onboardHotelSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
