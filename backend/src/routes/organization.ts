import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";
import { env } from "../config/env.js";

const createOrganizationSchema = z.object({
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

const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
  brandSettings: z.record(z.unknown()).optional(),
});

const onboardFranchiseWizardSchema = z.object({
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

export const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /
   * List franchise organizations with location statistics.
   * Super Admins see all organizations. Franchise owners see their assigned organizations.
   */
  fastify.get("/", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const isSuperAdmin = caller.role === "SUPER_ADMIN";

    const query = request.query as {
      search?: string;
      type?: string;
      status?: string;
    };

    let whereClause: any = {};

    if (!isSuperAdmin) {
      // Non-super-admins only see organizations they belong to
      whereClause.users = {
        some: {
          userId: caller.id,
        },
      };
    }

    if (query.type) {
      whereClause.type = query.type;
    }
    if (query.status) {
      whereClause.status = query.status;
    }
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
        { legalName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const organizations = await prisma.organization.findMany({
      where: whereClause,
      include: {
        locations: {
          select: {
            id: true,
            name: true,
            code: true,
            locationType: true,
            status: true,
            city: true,
            country: true,
            currency: true,
            currencySymbol: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = organizations.map((org) => {
      const totalLocations = org.locations.length;
      const activeLocations = org.locations.filter((l) => l.status === "ACTIVE").length;
      const suspendedLocations = org.locations.filter((l) => l.status === "SUSPENDED").length;

      return {
        id: org.id,
        name: org.name,
        code: org.code,
        type: org.type,
        legalName: org.legalName,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        address: org.address,
        status: org.status,
        brandSettings: org.brandSettings,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
        totalLocations,
        activeLocations,
        suspendedLocations,
        locations: org.locations,
        members: org.users.map((u) => ({
          userId: u.userId,
          name: u.user.name,
          email: u.user.email,
          orgRole: u.role,
        })),
      };
    });

    return reply.status(200).send(formatSuccessResponse(formatted, request));
  });

  /**
   * POST /
   * Create a new organization (Super Admin only).
   */
  fastify.post(
    "/",
    { preHandler: [requireRoles("SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const parseResult = createOrganizationSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const data = parseResult.data;
      const normalizedCode = data.code.toLowerCase().trim();

      const existing = await prisma.organization.findUnique({
        where: { code: normalizedCode },
      });
      if (existing) {
        throw new AppError(
          `Organization with code '${normalizedCode}' already exists`,
          409,
          "ORGANIZATION_EXISTS"
        );
      }

      const org = await prisma.organization.create({
        data: {
          name: data.name,
          code: normalizedCode,
          type: data.type,
          legalName: data.legalName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          brandSettings: (data.brandSettings as any) || {},
          status: "ACTIVE",
        },
      });

      await auditService.record({
        tenantId: caller.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "ORGANIZATION_CREATED",
        resource: "organizations",
        resourceId: org.id,
        details: { name: org.name, code: org.code, type: org.type },
        ipAddress: request.ip,
      });

      return reply.status(201).send(formatSuccessResponse(org, request));
    }
  );

  /**
   * POST /franchise/onboard
   * Super Admin Wizard to atomically onboard a franchise organization,
   * its initial location, operational tenant, and provision administrative accounts.
   */
  fastify.post(
    "/franchise/onboard",
    { preHandler: [requireRoles("SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const parseResult = onboardFranchiseWizardSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const { organization, firstLocation, franchiseOwner, locationAdmin } = parseResult.data;
      const normalizedOrgCode = organization.code.toLowerCase().trim();

      // Uniqueness pre-checks
      const existingOrg = await prisma.organization.findUnique({
        where: { code: normalizedOrgCode },
      });
      if (existingOrg) {
        throw new AppError(
          `An organization with code '${normalizedOrgCode}' already exists`,
          409,
          "ORGANIZATION_EXISTS"
        );
      }

      let normalizedLocCode: string | undefined = undefined;
      if (firstLocation) {
        normalizedLocCode = firstLocation.code.toLowerCase().trim();
        const [existingLoc, existingTenant] = await Promise.all([
          prisma.location.findUnique({ where: { code: normalizedLocCode } }),
          prisma.tenant.findUnique({ where: { code: normalizedLocCode } }),
        ]);
        if (existingLoc || existingTenant) {
          throw new AppError(
            `A location or tenant with code '${normalizedLocCode}' already exists`,
            409,
            "LOCATION_EXISTS"
          );
        }
      }

      let ownerEmailNorm: string | undefined = undefined;
      if (franchiseOwner) {
        ownerEmailNorm = normalizeEmail(franchiseOwner.email);
        const existingUser = await prisma.user.findUnique({ where: { email: ownerEmailNorm } });
        if (existingUser) {
          throw new AppError(
            `A user with email '${ownerEmailNorm}' already exists`,
            409,
            "USER_EXISTS"
          );
        }
      }

      let adminEmailNorm: string | undefined = undefined;
      if (locationAdmin) {
        adminEmailNorm = normalizeEmail(locationAdmin.email);
        const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmailNorm } });
        if (existingAdmin) {
          throw new AppError(
            `A user with email '${adminEmailNorm}' already exists`,
            409,
            "USER_EXISTS"
          );
        }
      }

      // Atomic execution via database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Organization
        const newOrg = await tx.organization.create({
          data: {
            name: organization.name,
            code: normalizedOrgCode,
            type: "FRANCHISE",
            legalName: organization.legalName,
            contactEmail: organization.contactEmail,
            contactPhone: organization.contactPhone,
            address: organization.address,
            brandSettings: (organization.brandSettings as any) || {},
            status: "ACTIVE",
          },
        });

        let newTenant: any = null;
        let newLocation: any = null;

        // 2. Create First Location & Operational Tenant if specified
        if (firstLocation && normalizedLocCode) {
          newTenant = await tx.tenant.create({
            data: {
              name: firstLocation.name,
              code: normalizedLocCode,
              timezone: firstLocation.timezone,
              currency: firstLocation.currency,
              currencySymbol: firstLocation.currencySymbol,
              gstin: firstLocation.gstin || null,
              cgstRate: firstLocation.cgstRate,
              sgstRate: firstLocation.sgstRate,
              serviceChargeRate: firstLocation.serviceChargeRate,
              hasAccommodation: firstLocation.hasAccommodation,
              hasRestaurant: firstLocation.hasRestaurant,
              isActive: true,
              settings: {},
            },
          });

          newLocation = await tx.location.create({
            data: {
              organizationId: newOrg.id,
              tenantId: newTenant.id,
              name: firstLocation.name,
              code: normalizedLocCode,
              locationType: firstLocation.locationType,
              address: firstLocation.address,
              city: firstLocation.city,
              state: firstLocation.state,
              postalCode: firstLocation.postalCode,
              country: firstLocation.country,
              timezone: firstLocation.timezone,
              currency: firstLocation.currency,
              currencySymbol: firstLocation.currencySymbol,
              contactEmail: firstLocation.contactEmail,
              contactPhone: firstLocation.contactPhone,
              gstin: firstLocation.gstin || null,
              enabledModules: firstLocation.enabledModules || {
                accommodation: firstLocation.hasAccommodation,
                restaurant: firstLocation.hasRestaurant,
                inventory: true,
                kds: true,
              },
              status: "ACTIVE",
            },
          });
        }

        // 3. Provision Franchise Owner if specified
        let createdOwner: any = null;
        if (franchiseOwner && ownerEmailNorm) {
          const ownerHash = await hashPassword(franchiseOwner.password);
          // Owner is linked to primary operational tenant (or location tenant)
          const ownerTenantId = newTenant ? newTenant.id : caller.tenantId;

          createdOwner = await tx.user.create({
            data: {
              tenantId: ownerTenantId,
              name: franchiseOwner.name,
              email: ownerEmailNorm,
              role: "ADMIN",
              phoneNumber: franchiseOwner.phone || null,
              passwordHash: ownerHash,
              isActive: true,
            },
          });

          await tx.organizationUser.create({
            data: {
              organizationId: newOrg.id,
              userId: createdOwner.id,
              role: "FRANCHISE_OWNER",
            },
          });

          if (newLocation) {
            await tx.userLocationAssignment.create({
              data: {
                userId: createdOwner.id,
                locationId: newLocation.id,
                role: "ADMIN",
                isPrimary: true,
              },
            });
          }
        }

        // 4. Provision Location Administrator if specified
        let createdAdmin: any = null;
        if (locationAdmin && adminEmailNorm && newTenant && newLocation) {
          const adminHash = await hashPassword(locationAdmin.password);
          createdAdmin = await tx.user.create({
            data: {
              tenantId: newTenant.id,
              name: locationAdmin.name,
              email: adminEmailNorm,
              role: "ADMIN",
              phoneNumber: locationAdmin.phone || null,
              passwordHash: adminHash,
              isActive: true,
            },
          });

          await tx.userLocationAssignment.create({
            data: {
              userId: createdAdmin.id,
              locationId: newLocation.id,
              role: "ADMIN",
              isPrimary: true,
            },
          });
        }

        return {
          organization: newOrg,
          location: newLocation,
          tenant: newTenant,
          owner: createdOwner
            ? {
                id: createdOwner.id,
                name: createdOwner.name,
                email: createdOwner.email,
                role: createdOwner.role,
              }
            : null,
          locationAdmin: createdAdmin
            ? {
                id: createdAdmin.id,
                name: createdAdmin.name,
                email: createdAdmin.email,
                role: createdAdmin.role,
              }
            : null,
        };
      });

      await auditService.record({
        tenantId: result.tenant?.id || caller.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "FRANCHISE_ONBOARDED",
        resource: "organizations",
        resourceId: result.organization.id,
        details: {
          orgName: result.organization.name,
          orgCode: result.organization.code,
          firstLocationName: result.location?.name,
          ownerEmail: result.owner?.email,
          adminEmail: result.locationAdmin?.email,
        },
        ipAddress: request.ip,
      });

      return reply.status(201).send(formatSuccessResponse(result, request));
    }
  );

  /**
   * GET /:id
   * Get organization details, locations, and assigned members.
   */
  fastify.get("/:id", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            tenant: {
              select: {
                id: true,
                code: true,
                hasAccommodation: true,
                hasRestaurant: true,
                cgstRate: true,
                sgstRate: true,
                serviceChargeRate: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new AppError("Organization not found", 404, "NOT_FOUND");
    }

    // Access check: Super Admin or Member
    if (caller.role !== "SUPER_ADMIN") {
      const isMember = org.users.some((m) => m.userId === caller.id);
      if (!isMember) {
        throw new AppError("Access denied to organization", 403, "FORBIDDEN");
      }
    }

    return reply.status(200).send(formatSuccessResponse(org, request));
  });

  /**
   * PUT /:id
   * Update organization details.
   */
  fastify.put("/:id", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const existing = await prisma.organization.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!existing) {
      throw new AppError("Organization not found", 404, "NOT_FOUND");
    }

    if (caller.role !== "SUPER_ADMIN") {
      const isOwner = existing.users.some(
        (m) => m.userId === caller.id && m.role === "FRANCHISE_OWNER"
      );
      if (!isOwner) {
        throw new AppError("Unauthorized: only Super Admin or Franchise Owner can update organization", 403, "FORBIDDEN");
      }
    }

    const parseResult = updateOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new AppError(
        "Validation failed",
        400,
        "VALIDATION_FAILED",
        parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
      );
    }

    const data = parseResult.data;
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.legalName !== undefined && { legalName: data.legalName }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.brandSettings && { brandSettings: data.brandSettings as any }),
        ...(data.status && caller.role === "SUPER_ADMIN" && { status: data.status }),
      },
    });

    await auditService.record({
      tenantId: caller.tenantId,
      actorId: caller.id,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: "ORGANIZATION_UPDATED",
      resource: "organizations",
      resourceId: updated.id,
      details: { updatedFields: Object.keys(data) },
      ipAddress: request.ip,
    });

    return reply.status(200).send(formatSuccessResponse(updated, request));
  });

  /**
   * GET /:id/stats
   * Aggregated reporting across authorized locations of this organization.
   * Currencies are separated to prevent mixing totals.
   */
  fastify.get("/:id/stats", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        locations: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            currency: true,
            currencySymbol: true,
            status: true,
          },
        },
        users: true,
      },
    });

    if (!org) {
      throw new AppError("Organization not found", 404, "NOT_FOUND");
    }

    if (caller.role !== "SUPER_ADMIN") {
      const isMember = org.users.some((u) => u.userId === caller.id);
      if (!isMember) {
        throw new AppError("Access denied", 403, "FORBIDDEN");
      }
    }

    const tenantIds = org.locations.map((l) => l.tenantId);

    const [tablesCount, roomsCount, ordersSummary] = await Promise.all([
      prisma.table.count({ where: { tenantId: { in: tenantIds } } }),
      prisma.room.count({ where: { tenantId: { in: tenantIds } } }),
      prisma.order.findMany({
        where: { tenantId: { in: tenantIds } },
        select: {
          tenantId: true,
          grandTotal: true,
          status: true,
        },
      }),
    ]);

    // Group revenues by currency
    const revenueByCurrency: Record<string, { symbol: string; totalRevenue: number; ordersCount: number }> = {};
    for (const loc of org.locations) {
      if (!revenueByCurrency[loc.currency]) {
        revenueByCurrency[loc.currency] = {
          symbol: loc.currencySymbol,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }
    }

    for (const order of ordersSummary) {
      const loc = org.locations.find((l) => l.tenantId === order.tenantId);
      if (loc) {
        const curr = loc.currency;
        revenueByCurrency[curr].ordersCount += 1;
        revenueByCurrency[curr].totalRevenue += Number(order.grandTotal || 0);
      }
    }

    return reply.status(200).send(
      formatSuccessResponse(
        {
          organizationId: org.id,
          totalLocations: org.locations.length,
          activeLocations: org.locations.filter((l) => l.status === "ACTIVE").length,
          suspendedLocations: org.locations.filter((l) => l.status === "SUSPENDED").length,
          totalTables: tablesCount,
          totalRooms: roomsCount,
          totalOrders: ordersSummary.length,
          revenueByCurrency,
        },
        request
      )
    );
  });
};
