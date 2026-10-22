import type { Prisma } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { ConflictError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { ActorContext } from "../types/auth.types.js";
import { ensureFound } from "../lib/guards.js";
import { tenantModel } from "../models/tenant.model.js";
import { userModel } from "../models/user.model.js";
import { auditService } from "./audit.service.js";
import { env } from "../config/env.js";
import type { OnboardActor } from "../types/tenant.types.js";
import type { OnboardHotelInput, UpdateTenantInput } from "../validations/tenant.validation.js";

export const tenantService = {
  async listTenants() {
    return tenantModel.findAll();
  },

  isValidBootstrapToken(token: unknown): boolean {
    const secret = env.BOOTSTRAP_SECRET;
    return !!secret && secret.length >= 32 && typeof token === "string" && token === secret;
  },

  async onboardHotel(actor: OnboardActor, data: OnboardHotelInput) {
    const normalizedAdminEmail = normalizeEmail(data.adminEmail);

    const [existingTenant, existingAdmin] = await Promise.all([
      tenantModel.findByCode(data.code),
      userModel.findByEmail(normalizedAdminEmail),
    ]);

    if (existingTenant) {
      throw new ConflictError(`A hotel with code '${data.code}' already exists`, ErrorCode.TENANT_EXISTS);
    }
    if (existingAdmin) {
      throw new ConflictError(`A staff account with email '${normalizedAdminEmail}' already exists`, ErrorCode.USER_EXISTS);
    }

    const adminPasswordHash = await hashPassword(data.adminPassword);

    const { tenant, adminUser } = await withTransaction(async (tx) => {
      const newTenant = await tenantModel.create(
        {
          name: data.name,
          code: data.code,
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

      const newAdmin = await userModel.create(
        {
          tenantId: newTenant.id,
          name: data.adminName,
          email: normalizedAdminEmail,
          role: "ADMIN",
          phoneNumber: data.adminPhone || null,
          passwordHash: adminPasswordHash,
          isActive: true,
        },
        tx
      );

      return { tenant: newTenant, adminUser: newAdmin };
    });

    await auditService.record({
      tenantId: tenant.id,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      actorRole: "SUPER_ADMIN",
      action: "HOTEL_ONBOARDED",
      resource: "tenants",
      resourceId: tenant.id,
      details: {
        hotelName: tenant.name,
        code: tenant.code,
        adminEmail: adminUser.email,
        hasAccommodation: tenant.hasAccommodation,
        hasRestaurant: tenant.hasRestaurant,
      },
      ipAddress: actor.ipAddress,
    });

    return {
      tenant,
      adminUser: {
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        createdAt: adminUser.createdAt.toISOString(),
      },
    };
  },

  async getCurrentTenant(actor: ActorContext) {
    return ensureFound(
      await tenantModel.findById(actor.user.tenantId),
      "Hotel property profile not found"
    );
  },

  async updateCurrentTenant(actor: ActorContext, data: UpdateTenantInput) {
    const { user } = actor;

    const updated = await tenantModel.upsert(
      user.tenantId,
      {
        id: user.tenantId,
        name: data.name || "Hotel Property",
        code: `tenant-${user.tenantId.slice(0, 8)}`,
        timezone: data.timezone || "Asia/Kolkata",
        currency: data.currency || "INR",
        currencySymbol: data.currencySymbol || "₹",
        gstin: data.gstin || null,
        cgstRate: data.cgstRate ?? 2.5,
        sgstRate: data.sgstRate ?? 2.5,
        serviceChargeRate: data.serviceChargeRate ?? 0,
        hasAccommodation: data.hasAccommodation ?? true,
        hasRestaurant: data.hasRestaurant ?? true,
        isActive: true,
        // z.record(z.unknown()) is JSON from the request body, so it is a valid JSON object
        settings: (data.settings as Prisma.InputJsonObject | undefined) || {},
      },
      {
        ...(data.name ? { name: data.name } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.currencySymbol ? { currencySymbol: data.currencySymbol } : {}),
        ...(data.gstin !== undefined ? { gstin: data.gstin } : {}),
        ...(data.cgstRate !== undefined ? { cgstRate: data.cgstRate } : {}),
        ...(data.sgstRate !== undefined ? { sgstRate: data.sgstRate } : {}),
        ...(data.serviceChargeRate !== undefined ? { serviceChargeRate: data.serviceChargeRate } : {}),
        ...(data.hasAccommodation !== undefined ? { hasAccommodation: data.hasAccommodation } : {}),
        ...(data.hasRestaurant !== undefined ? { hasRestaurant: data.hasRestaurant } : {}),
        ...(data.settings ? { settings: data.settings as Prisma.InputJsonObject } : {}),
      }
    );

    await auditService.recordAction(actor, {
      action: "HOTEL_SETTINGS_UPDATED",
      resource: "tenants",
      resourceId: updated.id,
      details: data,
    });

    return updated;
  },

  async getReadiness(actor: ActorContext) {
    const tenantId = actor.user.tenantId;

    const [tenant, counts] = await Promise.all([
      tenantModel.findById(tenantId),
      tenantModel.countActiveSetup(tenantId),
    ]);
    const { tablesCount, roomsCount, menuCategoriesCount, menuItemsCount, staffCount } = counts;

    const hasRestaurant = tenant?.hasRestaurant ?? true;
    const hasAccommodation = tenant?.hasAccommodation ?? true;

    const steps = [
      {
        key: "profile",
        label: "Hotel Profile & Legal Identity",
        completed: !!(tenant?.name && tenant?.currency),
        details: tenant?.name ? `Configured as '${tenant.name}'` : "Not configured",
      },
      {
        key: "taxation",
        label: "Taxation & GST Rates",
        completed: !!(tenant?.gstin || (tenant?.cgstRate && tenant?.sgstRate)),
        details: tenant?.gstin ? `GSTIN: ${tenant.gstin}` : "Configured with default tax rates",
      },
      ...(hasRestaurant
        ? [
            {
              key: "tables",
              label: "Restaurant Dining Tables",
              completed: tablesCount > 0,
              details: `${tablesCount} active table(s) configured`,
            },
            {
              key: "menu",
              label: "Menu Categories & Items",
              completed: menuCategoriesCount > 0 && menuItemsCount > 0,
              details: `${menuCategoriesCount} categories, ${menuItemsCount} dishes active`,
            },
          ]
        : []),
      ...(hasAccommodation
        ? [
            {
              key: "rooms",
              label: "Guestrooms & Suites",
              completed: roomsCount > 0,
              details: `${roomsCount} active room(s) configured`,
            },
          ]
        : []),
      {
        key: "staff",
        label: "Hospitality Staff Accounts",
        completed: staffCount >= 1,
        details: `${staffCount} active staff member(s)`,
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalSteps = steps.length;

    return {
      tenant: tenant || { name: "New Hotel", code: "hotel", id: tenantId },
      metrics: {
        tablesCount,
        roomsCount,
        menuCategoriesCount,
        menuItemsCount,
        staffCount,
      },
      readiness: {
        percentage: Math.round((completedCount / totalSteps) * 100),
        isPilotReady: completedCount === totalSteps,
        completedCount,
        totalSteps,
        steps,
      },
    };
  },
};
