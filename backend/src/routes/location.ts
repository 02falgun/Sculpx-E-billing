import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";

const createLocationSchema = z.object({
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

const updateLocationSchema = z.object({
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

const assignUserLocationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["ADMIN", "MANAGER", "CAPTAIN", "WAITER", "CASHIER", "KITCHEN_STAFF"]).optional(),
  isPrimary: z.boolean().default(false),
});

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /
   * List locations scoped by user privileges.
   */
  fastify.get("/", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const isSuperAdmin = caller.role === "SUPER_ADMIN";

    const query = request.query as {
      organizationId?: string;
      status?: string;
      locationType?: string;
      search?: string;
    };

    let whereClause: any = {};

    if (!isSuperAdmin) {
      // Find locations user is assigned to OR locations belonging to organizations user is a member of
      const userAssignments = await prisma.userLocationAssignment.findMany({
        where: { userId: caller.id },
        select: { locationId: true },
      });
      const orgMemberships = await prisma.organizationUser.findMany({
        where: { userId: caller.id },
        select: { organizationId: true },
      });

      const allowedLocationIds = userAssignments.map((a) => a.locationId);
      const allowedOrgIds = orgMemberships.map((m) => m.organizationId);

      whereClause.OR = [
        { id: { in: allowedLocationIds } },
        { organizationId: { in: allowedOrgIds } },
        { tenantId: caller.tenantId },
      ];
    }

    if (query.organizationId) {
      whereClause.organizationId = query.organizationId;
    }
    if (query.status) {
      whereClause.status = query.status;
    }
    if (query.locationType) {
      whereClause.locationType = query.locationType;
    }
    if (query.search) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { code: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const locations = await prisma.location.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        tenant: {
          select: {
            id: true,
            code: true,
            hasAccommodation: true,
            hasRestaurant: true,
            cgstRate: true,
            sgstRate: true,
            serviceChargeRate: true,
            isActive: true,
          },
        },
        userAssignments: {
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

    const formatted = locations.map((loc) => ({
      id: loc.id,
      organizationId: loc.organizationId,
      organization: loc.organization,
      tenantId: loc.tenantId,
      name: loc.name,
      code: loc.code,
      locationType: loc.locationType,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      postalCode: loc.postalCode,
      country: loc.country,
      timezone: loc.timezone,
      currency: loc.currency,
      currencySymbol: loc.currencySymbol,
      contactEmail: loc.contactEmail,
      contactPhone: loc.contactPhone,
      gstin: loc.gstin,
      enabledModules: loc.enabledModules,
      status: loc.status,
      taxSettings: {
        cgstRate: loc.tenant?.cgstRate ? Number(loc.tenant.cgstRate) : 2.5,
        sgstRate: loc.tenant?.sgstRate ? Number(loc.tenant.sgstRate) : 2.5,
        serviceChargeRate: loc.tenant?.serviceChargeRate ? Number(loc.tenant.serviceChargeRate) : 5.0,
      },
      assignedStaffCount: loc.userAssignments.length,
      createdAt: loc.createdAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    }));

    return reply.status(200).send(formatSuccessResponse(formatted, request));
  });

  /**
   * POST /
   * Create a new location (Super Admin only).
   * Supports independent business location (organizationId = null)
   * or location affiliated with a franchise organization.
   */
  fastify.post(
    "/",
    { preHandler: [requireRoles("SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const parseResult = createLocationSchema.safeParse(request.body);
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

      // Check uniqueness of code
      const [existingLoc, existingTenant] = await Promise.all([
        prisma.location.findUnique({ where: { code: normalizedCode } }),
        prisma.tenant.findUnique({ where: { code: normalizedCode } }),
      ]);

      if (existingLoc || existingTenant) {
        throw new AppError(
          `A location or hotel with code '${normalizedCode}' already exists`,
          409,
          "LOCATION_EXISTS"
        );
      }

      // If organizationId provided, verify it exists
      if (data.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: data.organizationId },
        });
        if (!org) {
          throw new AppError("Specified organization not found", 404, "ORGANIZATION_NOT_FOUND");
        }
      }

      let adminEmailNorm: string | undefined = undefined;
      if (data.adminEmail) {
        adminEmailNorm = normalizeEmail(data.adminEmail);
        const existingAdmin = await prisma.user.findUnique({
          where: { email: adminEmailNorm },
        });
        if (existingAdmin) {
          throw new AppError(
            `A staff account with email '${adminEmailNorm}' already exists`,
            409,
            "USER_EXISTS"
          );
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Tenant (operational boundary)
        const tenant = await tx.tenant.create({
          data: {
            name: data.name,
            code: normalizedCode,
            timezone: data.timezone,
            currency: data.currency,
            currencySymbol: data.currencySymbol,
            gstin: data.gstin || null,
            cgstRate: data.cgstRate,
            sgstRate: data.sgstRate,
            serviceChargeRate: data.serviceChargeRate,
            hasAccommodation: data.hasAccommodation,
            hasRestaurant: data.hasRestaurant,
            isActive: true,
            settings: {},
          },
        });

        // 2. Create Location
        const location = await tx.location.create({
          data: {
            organizationId: data.organizationId || null,
            tenantId: tenant.id,
            name: data.name,
            code: normalizedCode,
            locationType: data.locationType,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            postalCode: data.postalCode || null,
            country: data.country,
            timezone: data.timezone,
            currency: data.currency,
            currencySymbol: data.currencySymbol,
            contactEmail: data.contactEmail || null,
            contactPhone: data.contactPhone || null,
            gstin: data.gstin || null,
            enabledModules: data.enabledModules || {
              accommodation: data.hasAccommodation,
              restaurant: data.hasRestaurant,
              inventory: true,
              kds: true,
            },
            status: "ACTIVE",
          },
        });

        // 3. Provision Location Administrator if provided
        let adminUser: any = null;
        if (data.adminName && adminEmailNorm && data.adminPassword) {
          const passwordHash = await hashPassword(data.adminPassword);
          adminUser = await tx.user.create({
            data: {
              tenantId: tenant.id,
              name: data.adminName,
              email: adminEmailNorm,
              role: "ADMIN",
              phoneNumber: data.adminPhone || null,
              passwordHash,
              isActive: true,
            },
          });

          await tx.userLocationAssignment.create({
            data: {
              userId: adminUser.id,
              locationId: location.id,
              role: "ADMIN",
              isPrimary: true,
            },
          });
        }

        return {
          location,
          tenant,
          adminUser: adminUser
            ? {
                id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
              }
            : null,
        };
      });

      await auditService.record({
        tenantId: result.tenant.id,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "LOCATION_CREATED",
        resource: "locations",
        resourceId: result.location.id,
        details: {
          name: result.location.name,
          code: result.location.code,
          organizationId: result.location.organizationId,
          tenantId: result.tenant.id,
          adminEmail: result.adminUser?.email,
        },
        ipAddress: request.ip,
      });

      return reply.status(201).send(formatSuccessResponse(result, request));
    }
  );

  /**
   * GET /:id
   * Get location details and operational status.
   */
  fastify.get("/:id", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        organization: true,
        tenant: true,
        userAssignments: {
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

    if (!loc) {
      throw new AppError("Location not found", 404, "NOT_FOUND");
    }

    // Access check: Super Admin or assigned to location or member of organization
    if (caller.role !== "SUPER_ADMIN") {
      const isAssigned = loc.userAssignments.some((a) => a.userId === caller.id);
      let isOrgMember = false;
      if (loc.organizationId) {
        const membership = await prisma.organizationUser.findFirst({
          where: { organizationId: loc.organizationId, userId: caller.id },
        });
        isOrgMember = Boolean(membership);
      }
      const isOwnTenant = loc.tenantId === caller.tenantId;

      if (!isAssigned && !isOrgMember && !isOwnTenant) {
        throw new AppError("Access denied to location", 403, "FORBIDDEN");
      }
    }

    return reply.status(200).send(formatSuccessResponse(loc, request));
  });

  /**
   * PUT /:id
   * Update location configuration.
   */
  fastify.put("/:id", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const existing = await prisma.location.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!existing) {
      throw new AppError("Location not found", 404, "NOT_FOUND");
    }

    // Super Admin or Location Admin can update
    if (caller.role !== "SUPER_ADMIN") {
      const isLocAdmin = caller.role === "ADMIN" && caller.tenantId === existing.tenantId;
      if (!isLocAdmin) {
        throw new AppError("Unauthorized to modify location settings", 403, "FORBIDDEN");
      }
    }

    const parseResult = updateLocationSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new AppError(
        "Validation failed",
        400,
        "VALIDATION_FAILED",
        parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
      );
    }

    const data = parseResult.data;

    // Execute atomic update across Location and Tenant
    const updated = await prisma.$transaction(async (tx) => {
      const updatedLoc = await tx.location.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.organizationId !== undefined && { organizationId: data.organizationId }),
          ...(data.locationType && { locationType: data.locationType }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
          ...(data.country && { country: data.country }),
          ...(data.timezone && { timezone: data.timezone }),
          ...(data.currency && { currency: data.currency }),
          ...(data.currencySymbol && { currencySymbol: data.currencySymbol }),
          ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
          ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
          ...(data.gstin !== undefined && { gstin: data.gstin }),
          ...(data.enabledModules && { enabledModules: data.enabledModules }),
          ...(data.status && caller.role === "SUPER_ADMIN" && { status: data.status }),
        },
      });

      // Synchronize operational tenant settings
      await tx.tenant.update({
        where: { id: existing.tenantId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.timezone && { timezone: data.timezone }),
          ...(data.currency && { currency: data.currency }),
          ...(data.currencySymbol && { currencySymbol: data.currencySymbol }),
          ...(data.gstin !== undefined && { gstin: data.gstin }),
          ...(data.cgstRate !== undefined && { cgstRate: data.cgstRate }),
          ...(data.sgstRate !== undefined && { sgstRate: data.sgstRate }),
          ...(data.serviceChargeRate !== undefined && { serviceChargeRate: data.serviceChargeRate }),
          ...(data.hasAccommodation !== undefined && { hasAccommodation: data.hasAccommodation }),
          ...(data.hasRestaurant !== undefined && { hasRestaurant: data.hasRestaurant }),
          ...(data.status && { isActive: data.status === "ACTIVE" }),
        },
      });

      return updatedLoc;
    });

    await auditService.record({
      tenantId: existing.tenantId,
      actorId: caller.id,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: "LOCATION_UPDATED",
      resource: "locations",
      resourceId: updated.id,
      details: { updatedFields: Object.keys(data) },
      ipAddress: request.ip,
    });

    return reply.status(200).send(formatSuccessResponse(updated, request));
  });

  /**
   * PUT /:id/status
   * Activate, Suspend, or Archive a location (Super Admin only).
   */
  fastify.put(
    "/:id/status",
    { preHandler: [requireRoles("SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const statusSchema = z.object({
        status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]),
        reason: z.string().optional(),
      });

      const parseResult = statusSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError("Invalid status parameter", 400, "VALIDATION_FAILED");
      }

      const { status, reason } = parseResult.data;

      const loc = await prisma.location.findUnique({
        where: { id },
      });
      if (!loc) {
        throw new AppError("Location not found", 404, "NOT_FOUND");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const uLoc = await tx.location.update({
          where: { id },
          data: { status },
        });

        await tx.tenant.update({
          where: { id: loc.tenantId },
          data: { isActive: status === "ACTIVE" },
        });

        return uLoc;
      });

      await auditService.record({
        tenantId: loc.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: `LOCATION_${status}`,
        resource: "locations",
        resourceId: updated.id,
        details: { previousStatus: loc.status, newStatus: status, reason },
        ipAddress: request.ip,
      });

      return reply.status(200).send(formatSuccessResponse(updated, request));
    }
  );

  /**
   * POST /:id/assign-user
   * Assign a user to this location.
   */
  fastify.post(
    "/:id/assign-user",
    { preHandler: [requireRoles("SUPER_ADMIN", "ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const parseResult = assignUserLocationSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError("Validation failed", 400, "VALIDATION_FAILED");
      }

      const { userId, role, isPrimary } = parseResult.data;

      const loc = await prisma.location.findUnique({ where: { id } });
      if (!loc) {
        throw new AppError("Location not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && caller.tenantId !== loc.tenantId) {
        throw new AppError("Unauthorized to assign users to this location", 403, "FORBIDDEN");
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        throw new AppError("User not found", 404, "NOT_FOUND");
      }

      const assignment = await prisma.userLocationAssignment.upsert({
        where: {
          userId_locationId: {
            userId,
            locationId: id,
          },
        },
        create: {
          userId,
          locationId: id,
          role: role || targetUser.role,
          isPrimary,
        },
        update: {
          role: role || targetUser.role,
          isPrimary,
        },
      });

      return reply.status(200).send(formatSuccessResponse(assignment, request));
    }
  );

  /**
   * GET /:id/stats
   * Real database-backed metrics for a single location.
   */
  fastify.get("/:id/stats", async (request, reply) => {
    const caller = request.authenticatedUser!;
    const { id } = request.params as { id: string };

    const loc = await prisma.location.findUnique({ where: { id } });
    if (!loc) {
      throw new AppError("Location not found", 404, "NOT_FOUND");
    }

    const tenantId = loc.tenantId;

    const [
      tablesCount,
      roomsCount,
      qrCount,
      categoriesCount,
      menuItemsCount,
      staffCount,
      ordersCount,
      revenueResult,
    ] = await Promise.all([
      prisma.table.count({ where: { tenantId } }),
      prisma.room.count({ where: { tenantId } }),
      prisma.qrCode.count({ where: { tenantId } }),
      prisma.menuCategory.count({ where: { tenantId } }),
      prisma.menuItem.count({ where: { category: { tenantId } } }),
      prisma.userLocationAssignment.count({ where: { locationId: id } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId },
        _sum: { grandTotal: true },
      }),
    ]);

    return reply.status(200).send(
      formatSuccessResponse(
        {
          locationId: loc.id,
          name: loc.name,
          code: loc.code,
          status: loc.status,
          currency: loc.currency,
          currencySymbol: loc.currencySymbol,
          tablesCount,
          roomsCount,
          qrCount,
          categoriesCount,
          menuItemsCount,
          staffCount,
          ordersCount,
          totalRevenue: Number(revenueResult._sum.grandTotal || 0),
        },
        request
      )
    );
  });
};
