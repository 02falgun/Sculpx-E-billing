import { z } from "zod";

export const locationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createLocationSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID").optional().nullable(),
  name: z.string().min(2, "Location name must be at least 2 characters").max(255),
  code: z
    .string()
    .min(2, "Location code must be at least 2 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9-]+$/, "Location code must contain only alphanumeric characters and hyphens"),
  locationType: z.enum(["RESTAURANT", "HOTEL", "COMBINED"]).default("COMBINED"),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().default("India"),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  cgstRate: z.coerce.number().min(0).max(100).default(2.5),
  sgstRate: z.coerce.number().min(0).max(100).default(2.5),
  serviceChargeRate: z.coerce.number().min(0).max(100).default(5.0),
  hasAccommodation: z.boolean().default(true),
  hasRestaurant: z.boolean().default(true),
  enabledModules: z.record(z.boolean()).optional(),
  adminName: z.string().min(2).max(255).optional().nullable(),
  adminEmail: z.string().email().optional().nullable(),
  adminPassword: z.string().min(8).optional().nullable(),
  adminPhone: z.string().max(50).optional().nullable(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  locationType: z.enum(["RESTAURANT", "HOTEL", "COMBINED"]).optional(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  cgstRate: z.coerce.number().min(0).max(100).optional(),
  sgstRate: z.coerce.number().min(0).max(100).optional(),
  serviceChargeRate: z.coerce.number().min(0).max(100).optional(),
  hasAccommodation: z.boolean().optional(),
  hasRestaurant: z.boolean().optional(),
  enabledModules: z.record(z.boolean()).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});

export const locationStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]),
  reason: z.string().optional(),
});

export const assignUserLocationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["ADMIN", "MANAGER", "CAPTAIN", "WAITER", "CASHIER", "KITCHEN_STAFF"]).optional(),
  isPrimary: z.boolean().default(false),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type LocationStatusInput = z.infer<typeof locationStatusSchema>;
export type AssignUserLocationInput = z.infer<typeof assignUserLocationSchema>;
