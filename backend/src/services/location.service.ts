import type { Location, User } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { ConflictError, ForbiddenError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { ActorContext } from "../types/auth.types.js";
import { ensureFound, assertTenantAccess } from "../lib/guards.js";
import { locationModel } from "../models/location.model.js";
import { tenantModel } from "../models/tenant.model.js";
import { userModel } from "../models/user.model.js";
import { organizationModel } from "../models/organization.model.js";
import { auditService } from "./audit.service.js";
import type { ListLocationsQuery, LocationAccessScope } from "../types/location.types.js";
import type {
  CreateLocationInput,
  UpdateLocationInput,
  LocationStatusInput,
  AssignUserLocationInput,
} from "../validations/location.validation.js";

async function getLocationOrThrow(id: string) {
  return ensureFound(await locationModel.findById(id), "Location not found");
}

export const locationService = {
  async listLocations(actor: ActorContext, query: ListLocationsQuery) {
    const caller = actor.user;
    const isSuperAdmin = caller.role === "SUPER_ADMIN";

    let access: LocationAccessScope | undefined;
    if (!isSuperAdmin) {
      const locationIds = await locationModel.findAssignedLocationIds(caller.id);
      const organizationIds = await locationModel.findMemberOrganizationIds(caller.id);
      access = { locationIds, organizationIds, tenantId: caller.tenantId };
    }

    const locations = await locationModel.findManyWithSummary({
      access,
      organizationId: query.organizationId,
      status: query.status,
      locationType: query.locationType,
      search: query.search,
    });

    return locations.map((loc) => ({
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
  },

  async createLocation(actor: ActorContext, data: CreateLocationInput) {
    const normalizedCode = data.code.toLowerCase().trim();

    const [existingLoc, existingTenant] = await Promise.all([
      locationModel.findByCode(normalizedCode),
      tenantModel.findByCode(normalizedCode),
    ]);

    if (existingLoc || existingTenant) {
      throw new ConflictError(`A location or hotel with code '${normalizedCode}' already exists`, ErrorCode.LOCATION_EXISTS);
    }

    if (data.organizationId) {
      ensureFound(
        await organizationModel.findById(data.organizationId),
        "Specified organization not found",
        ErrorCode.ORGANIZATION_NOT_FOUND
      );
    }

    let adminEmailNorm: string | undefined = undefined;
    if (data.adminEmail) {
      adminEmailNorm = normalizeEmail(data.adminEmail);
      const existingAdmin = await userModel.findByEmail(adminEmailNorm);
      if (existingAdmin) {
        throw new ConflictError(`A staff account with email '${adminEmailNorm}' already exists`, ErrorCode.USER_EXISTS);
      }
    }

    const result = await withTransaction(async (tx) => {
      // 1. Create Tenant (operational boundary)
      const tenant = await tenantModel.create(
        {
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
        tx
      );

      // 2. Create Location
      const location = await locationModel.create(
        {
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
        tx
      );

      // 3. Provision Location Administrator if provided
      let adminUser: User | null = null;
      if (data.adminName && adminEmailNorm && data.adminPassword) {
        const passwordHash = await hashPassword(data.adminPassword);
        adminUser = await userModel.create(
          {
            tenantId: tenant.id,
            name: data.adminName,
            email: adminEmailNorm,
            role: "ADMIN",
            phoneNumber: data.adminPhone || null,
            passwordHash,
            isActive: true,
          },
          tx
        );

        await locationModel.assignUser(
          { userId: adminUser.id, locationId: location.id, role: "ADMIN", isPrimary: true },
          tx
        );
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

    await auditService.recordAction(actor, {
      tenantId: result.tenant.id,
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
    });

    return result;
  },

  async getLocation(actor: ActorContext, id: string) {
    const caller = actor.user;
    const loc = ensureFound(await locationModel.findByIdWithDetails(id), "Location not found");

    if (caller.role === "SUPER_ADMIN") {
      return loc;
    }

    // Otherwise the caller must be assigned to it, a member of its organization, or in its tenant
    const isAssigned = loc.userAssignments.some((a) => a.userId === caller.id);
    const isOrgMember = loc.organizationId
      ? Boolean(await locationModel.findOrganizationMembership(loc.organizationId, caller.id))
      : false;
    const isOwnTenant = loc.tenantId === caller.tenantId;

    if (!isAssigned && !isOrgMember && !isOwnTenant) {
      throw new ForbiddenError("Access denied to location");
    }

    return loc;
  },

  /**
   * Lookup + permission check for updates; runs before body validation.
   */
  async getUpdatableLocation(actor: ActorContext, id: string) {
    const caller = actor.user;
    const existing = ensureFound(await locationModel.findByIdWithTenant(id), "Location not found");

    // Only a Super Admin or this location's Admin may update it
    const isLocAdmin = caller.role === "ADMIN" && caller.tenantId === existing.tenantId;
    if (caller.role !== "SUPER_ADMIN" && !isLocAdmin) {
      throw new ForbiddenError("Unauthorized to modify location settings");
    }

    return existing;
  },

  async updateLocation(
    actor: ActorContext,
    existing: Pick<Location, "id" | "tenantId">,
    data: UpdateLocationInput
  ) {
    const caller = actor.user;
    const id = existing.id;

    // Location and its operational tenant are updated atomically
    const updated = await withTransaction(async (tx) => {
      const updatedLoc = await locationModel.update(
        id,
        {
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
        tx
      );

      // Synchronize operational tenant settings
      await tenantModel.update(
        existing.tenantId,
        {
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
        tx
      );

      return updatedLoc;
    });

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "LOCATION_UPDATED",
      resource: "locations",
      resourceId: updated.id,
      details: { updatedFields: Object.keys(data) },
    });

    return updated;
  },

  async updateLocationStatus(actor: ActorContext, id: string, { status, reason }: LocationStatusInput) {
    const loc = await getLocationOrThrow(id);

    const updated = await withTransaction(async (tx) => {
      const uLoc = await locationModel.update(id, { status }, tx);
      await tenantModel.update(loc.tenantId, { isActive: status === "ACTIVE" }, tx);
      return uLoc;
    });

    await auditService.recordAction(actor, {
      tenantId: loc.tenantId,
      action: `LOCATION_${status}`,
      resource: "locations",
      resourceId: updated.id,
      details: { previousStatus: loc.status, newStatus: status, reason },
    });

    return updated;
  },

  async assignUser(actor: ActorContext, id: string, { userId, role, isPrimary }: AssignUserLocationInput) {
    const loc = await getLocationOrThrow(id);
    assertTenantAccess(actor, loc.tenantId, "Unauthorized to assign users to this location");

    const targetUser = ensureFound(await userModel.findById(userId), "User not found");

    return locationModel.upsertAssignment(userId, id, {
      role: role || targetUser.role,
      isPrimary,
    });
  },

  async getLocationStats(id: string) {
    const loc = await getLocationOrThrow(id);
    const stats = await locationModel.countStats(id, loc.tenantId);

    return {
      locationId: loc.id,
      name: loc.name,
      code: loc.code,
      status: loc.status,
      currency: loc.currency,
      currencySymbol: loc.currencySymbol,
      ...stats,
    };
  },
};
