import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { LocationListFilter } from "../types/location.types.js";

const listInclude = {
  organization: {
    select: { id: true, name: true, code: true, type: true },
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
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} satisfies Prisma.LocationInclude;

const detailInclude = {
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
} satisfies Prisma.LocationInclude;

function toListWhere(filter: LocationListFilter): Prisma.LocationWhereInput {
  const where: Prisma.LocationWhereInput = {};
  if (filter.access) {
    where.OR = [
      { id: { in: filter.access.locationIds } },
      { organizationId: { in: filter.access.organizationIds } },
      { tenantId: filter.access.tenantId },
    ];
  }
  if (filter.organizationId) {
    where.organizationId = filter.organizationId;
  }
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.locationType) {
    where.locationType = filter.locationType;
  }
  if (filter.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: filter.search, mode: "insensitive" } },
          { code: { contains: filter.search, mode: "insensitive" } },
          { city: { contains: filter.search, mode: "insensitive" } },
        ],
      },
    ];
  }
  return where;
}

export const locationModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.location.findUnique({ where: { id } });
  },

  findByCode(code: string, db: DbClient = prisma) {
    return db.location.findUnique({ where: { code } });
  },

  findManyWithSummary(filter: LocationListFilter, db: DbClient = prisma) {
    return db.location.findMany({
      where: toListWhere(filter),
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findByIdWithDetails(id: string, db: DbClient = prisma) {
    return db.location.findUnique({ where: { id }, include: detailInclude });
  },

  /** Status of the location backing a tenant, if any. */
  findStatusByTenantId(tenantId: string, db: DbClient = prisma) {
    return db.location.findUnique({ where: { tenantId }, select: { status: true } });
  },

  findByIdWithTenant(id: string, db: DbClient = prisma) {
    return db.location.findUnique({ where: { id }, include: { tenant: true } });
  },

  create(data: Prisma.LocationUncheckedCreateInput, db: DbClient = prisma) {
    return db.location.create({ data });
  },

  update(id: string, data: Prisma.LocationUncheckedUpdateInput, db: DbClient = prisma) {
    return db.location.update({ where: { id }, data });
  },

  // Cross-entity helpers (assignments, memberships) used for location access.
  async findAssignedLocationIds(userId: string, db: DbClient = prisma) {
    const rows = await db.userLocationAssignment.findMany({
      where: { userId },
      select: { locationId: true },
    });
    return rows.map((a) => a.locationId);
  },

  async findMemberOrganizationIds(userId: string, db: DbClient = prisma) {
    const rows = await db.organizationUser.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return rows.map((m) => m.organizationId);
  },

  findOrganizationMembership(organizationId: string, userId: string, db: DbClient = prisma) {
    return db.organizationUser.findFirst({ where: { organizationId, userId } });
  },

  assignUser(data: Prisma.UserLocationAssignmentUncheckedCreateInput, db: DbClient = prisma) {
    return db.userLocationAssignment.create({ data });
  },

  upsertAssignment(
    userId: string,
    locationId: string,
    data: { role: Prisma.UserLocationAssignmentUncheckedCreateInput["role"]; isPrimary: boolean },
    db: DbClient = prisma
  ) {
    return db.userLocationAssignment.upsert({
      where: { userId_locationId: { userId, locationId } },
      create: { userId, locationId, role: data.role, isPrimary: data.isPrimary },
      update: { role: data.role, isPrimary: data.isPrimary },
    });
  },

  async countStats(id: string, tenantId: string, db: DbClient = prisma) {
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
      db.table.count({ where: { tenantId } }),
      db.room.count({ where: { tenantId } }),
      db.qrCode.count({ where: { tenantId } }),
      db.menuCategory.count({ where: { tenantId } }),
      db.menuItem.count({ where: { category: { tenantId } } }),
      db.userLocationAssignment.count({ where: { locationId: id } }),
      db.order.count({ where: { tenantId } }),
      db.order.aggregate({ where: { tenantId }, _sum: { grandTotal: true } }),
    ]);
    return {
      tablesCount,
      roomsCount,
      qrCount,
      categoriesCount,
      menuItemsCount,
      staffCount,
      ordersCount,
      totalRevenue: Number(revenueResult._sum.grandTotal || 0),
    };
  },
};
