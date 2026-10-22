import type { Location, Prisma, Tenant, User } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { ConflictError, ForbiddenError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { ActorContext } from "../types/auth.types.js";
import { ensureFound } from "../lib/guards.js";
import { organizationModel } from "../models/organization.model.js";
import { tenantModel } from "../models/tenant.model.js";
import { userModel } from "../models/user.model.js";
import { locationModel } from "../models/location.model.js";
import { auditService } from "./audit.service.js";
import type { ListOrganizationsQuery } from "../types/organization.types.js";
import type {
  CreateOrganizationInput,
  OnboardFranchiseInput,
  UpdateOrganizationInput,
} from "../validations/organization.validation.js";

// z.record(z.unknown()) holds JSON parsed from the request body, so it is a valid JSON object
function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ConflictError(`A user with email '${email}' already exists`, ErrorCode.USER_EXISTS);
  }
}

function summarizeUser(user: Pick<User, "id" | "name" | "email" | "role"> | null) {
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
}

export const organizationService = {
  async listOrganizations(actor: ActorContext, query: ListOrganizationsQuery) {
    const { user } = actor;

    const organizations = await organizationModel.findManyWithSummary({
      // Non-super-admins only see organizations they belong to
      memberUserId: user.role !== "SUPER_ADMIN" ? user.id : undefined,
      type: query.type,
      status: query.status,
      search: query.search,
    });

    return organizations.map((org) => ({
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
      totalLocations: org.locations.length,
      activeLocations: org.locations.filter((l) => l.status === "ACTIVE").length,
      suspendedLocations: org.locations.filter((l) => l.status === "SUSPENDED").length,
      locations: org.locations,
      members: org.users.map((u) => ({
        userId: u.userId,
        name: u.user.name,
        email: u.user.email,
        orgRole: u.role,
      })),
    }));
  },

  async createOrganization(actor: ActorContext, data: CreateOrganizationInput) {
    const normalizedCode = data.code.toLowerCase().trim();

    const existing = await organizationModel.findByCode(normalizedCode);
    if (existing) {
      throw new ConflictError(`Organization with code '${normalizedCode}' already exists`, ErrorCode.ORGANIZATION_EXISTS);
    }

    const org = await organizationModel.create({
      name: data.name,
      code: normalizedCode,
      type: data.type,
      legalName: data.legalName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      brandSettings: data.brandSettings ? toJsonObject(data.brandSettings) : {},
      status: "ACTIVE",
    });

    await auditService.recordAction(actor, {
      action: "ORGANIZATION_CREATED",
      resource: "organizations",
      resourceId: org.id,
      details: { name: org.name, code: org.code, type: org.type },
    });

    return org;
  },

  async onboardFranchise(actor: ActorContext, data: OnboardFranchiseInput) {
    const { user } = actor;
    const { organization, firstLocation, franchiseOwner, locationAdmin } = data;
    const normalizedOrgCode = organization.code.toLowerCase().trim();

    const existingOrg = await organizationModel.findByCode(normalizedOrgCode);
    if (existingOrg) {
      throw new ConflictError(`An organization with code '${normalizedOrgCode}' already exists`, ErrorCode.ORGANIZATION_EXISTS);
    }

    let normalizedLocCode: string | undefined = undefined;
    if (firstLocation) {
      normalizedLocCode = firstLocation.code.toLowerCase().trim();
      const [existingLoc, existingTenant] = await Promise.all([
        locationModel.findByCode(normalizedLocCode),
        tenantModel.findByCode(normalizedLocCode),
      ]);
      if (existingLoc || existingTenant) {
        throw new ConflictError(`A location or tenant with code '${normalizedLocCode}' already exists`, ErrorCode.LOCATION_EXISTS);
      }
    }

    let ownerEmailNorm: string | undefined = undefined;
    if (franchiseOwner) {
      ownerEmailNorm = normalizeEmail(franchiseOwner.email);
      await assertEmailAvailable(ownerEmailNorm);
    }

    let adminEmailNorm: string | undefined = undefined;
    if (locationAdmin) {
      adminEmailNorm = normalizeEmail(locationAdmin.email);
      await assertEmailAvailable(adminEmailNorm);
    }

    const result = await withTransaction(async (tx) => {
      const newOrg = await organizationModel.create(
        {
          name: organization.name,
          code: normalizedOrgCode,
          type: "FRANCHISE",
          legalName: organization.legalName,
          contactEmail: organization.contactEmail,
          contactPhone: organization.contactPhone,
          address: organization.address,
          brandSettings: organization.brandSettings ? toJsonObject(organization.brandSettings) : {},
          status: "ACTIVE",
        },
        tx
      );

      let newTenant: Tenant | null = null;
      let newLocation: Location | null = null;

      if (firstLocation && normalizedLocCode) {
        newTenant = await tenantModel.create(
          {
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
          tx
        );

        newLocation = await locationModel.create(
          {
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
          tx
        );
      }

      let createdOwner: User | null = null;
      if (franchiseOwner && ownerEmailNorm) {
        const ownerHash = await hashPassword(franchiseOwner.password);
        // Owner is linked to the new location tenant, or the caller's tenant if none
        const ownerTenantId = newTenant ? newTenant.id : user.tenantId;

        createdOwner = await userModel.create(
          {
            tenantId: ownerTenantId,
            name: franchiseOwner.name,
            email: ownerEmailNorm,
            role: "ADMIN",
            phoneNumber: franchiseOwner.phone || null,
            passwordHash: ownerHash,
            isActive: true,
          },
          tx
        );

        await organizationModel.addMember(
          { organizationId: newOrg.id, userId: createdOwner.id, role: "FRANCHISE_OWNER" },
          tx
        );

        if (newLocation) {
          await locationModel.assignUser(
            { userId: createdOwner.id, locationId: newLocation.id, role: "ADMIN", isPrimary: true },
            tx
          );
        }
      }

      let createdAdmin: User | null = null;
      if (locationAdmin && adminEmailNorm && newTenant && newLocation) {
        const adminHash = await hashPassword(locationAdmin.password);
        createdAdmin = await userModel.create(
          {
            tenantId: newTenant.id,
            name: locationAdmin.name,
            email: adminEmailNorm,
            role: "ADMIN",
            phoneNumber: locationAdmin.phone || null,
            passwordHash: adminHash,
            isActive: true,
          },
          tx
        );

        await locationModel.assignUser(
          { userId: createdAdmin.id, locationId: newLocation.id, role: "ADMIN", isPrimary: true },
          tx
        );
      }

      return {
        organization: newOrg,
        location: newLocation,
        tenant: newTenant,
        owner: summarizeUser(createdOwner),
        locationAdmin: summarizeUser(createdAdmin),
      };
    });

    await auditService.recordAction(actor, {
      tenantId: result.tenant?.id || user.tenantId,
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
    });

    return result;
  },

  async getOrganization(actor: ActorContext, id: string) {
    const { user } = actor;
    const org = ensureFound(
      await organizationModel.findByIdWithDetails(id),
      "Organization not found"
    );
    if (user.role !== "SUPER_ADMIN" && !org.users.some((m) => m.userId === user.id)) {
      throw new ForbiddenError("Access denied to organization");
    }

    return org;
  },

  async assertCanUpdate(actor: ActorContext, id: string): Promise<void> {
    const { user } = actor;
    const existing = ensureFound(
      await organizationModel.findByIdWithMembers(id),
      "Organization not found"
    );

    if (user.role === "SUPER_ADMIN") {
      return;
    }

    const isOwner = existing.users.some((m) => m.userId === user.id && m.role === "FRANCHISE_OWNER");
    if (!isOwner) {
      throw new ForbiddenError("Unauthorized: only Super Admin or Franchise Owner can update organization");
    }
  },

  async updateOrganization(actor: ActorContext, id: string, data: UpdateOrganizationInput) {
    const { user } = actor;
    const updated = await organizationModel.update(id, {
      ...(data.name && { name: data.name }),
      ...(data.legalName !== undefined && { legalName: data.legalName }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.brandSettings && { brandSettings: toJsonObject(data.brandSettings) }),
      ...(data.status && user.role === "SUPER_ADMIN" && { status: data.status }),
    });

    await auditService.recordAction(actor, {
      action: "ORGANIZATION_UPDATED",
      resource: "organizations",
      resourceId: updated.id,
      details: { updatedFields: Object.keys(data) },
    });

    return updated;
  },

  async getOrganizationStats(actor: ActorContext, id: string) {
    const { user } = actor;
    const org = ensureFound(await organizationModel.findByIdForStats(id), "Organization not found");
    if (user.role !== "SUPER_ADMIN" && !org.users.some((u) => u.userId === user.id)) {
      throw new ForbiddenError("Access denied");
    }

    const tenantIds = org.locations.map((l) => l.tenantId);

    const { tablesCount, roomsCount, orders: ordersSummary } =
      await organizationModel.getTenantsActivity(tenantIds);

    // Revenues are grouped by currency to avoid mixing totals
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
        revenueByCurrency[loc.currency].ordersCount += 1;
        revenueByCurrency[loc.currency].totalRevenue += Number(order.grandTotal || 0);
      }
    }

    return {
      organizationId: org.id,
      totalLocations: org.locations.length,
      activeLocations: org.locations.filter((l) => l.status === "ACTIVE").length,
      suspendedLocations: org.locations.filter((l) => l.status === "SUSPENDED").length,
      totalTables: tablesCount,
      totalRooms: roomsCount,
      totalOrders: ordersSummary.length,
      revenueByCurrency,
    };
  },
};
