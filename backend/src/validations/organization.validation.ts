import { z } from "zod";

export const organizationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(255),
  code: z
    .string()
    .min(2, "Organization code must be at least 2 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9-]+$/, "Organization code must contain only letters, numbers, and hyphens"),
  type: z.enum(["FRANCHISE", "INDEPENDENT"]).default("FRANCHISE"),
  legalName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  brandSettings: z.record(z.unknown()).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
  brandSettings: z.record(z.unknown()).optional(),
});

export const onboardFranchiseWizardSchema = z.object({
  organization: z.object({
    name: z.string().min(2, "Franchise name must be at least 2 characters").max(255),
    code: z
      .string()
      .min(2, "Franchise code must be at least 2 characters")
      .max(50)
      .regex(/^[a-zA-Z0-9-]+$/, "Franchise code must contain only alphanumeric characters and hyphens"),
    legalName: z.string().max(255).optional().nullable(),
    contactEmail: z.string().email("Invalid organization contact email").optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    brandSettings: z.record(z.unknown()).optional(),
  }),
  firstLocation: z
    .object({
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
    })
    .optional(),
  franchiseOwner: z
    .object({
      name: z.string().min(2, "Franchise owner name is required").max(255),
      email: z.string().email("Invalid franchise owner email"),
      password: z.string().min(8, "Franchise owner password must be at least 8 characters"),
      phone: z.string().max(50).optional().nullable(),
    })
    .optional(),
  locationAdmin: z
    .object({
      name: z.string().min(2, "Location administrator name is required").max(255),
      email: z.string().email("Invalid location administrator email"),
      password: z.string().min(8, "Location administrator password must be at least 8 characters"),
      phone: z.string().max(50).optional().nullable(),
    })
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OnboardFranchiseInput = z.infer<typeof onboardFranchiseWizardSchema>;
