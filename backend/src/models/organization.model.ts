import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { OrganizationListFilter } from "../types/organization.types.js";

const listInclude = {
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
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} satisfies Prisma.OrganizationInclude;

const detailInclude = {
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
} satisfies Prisma.OrganizationInclude;

const statsInclude = {
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
} satisfies Prisma.OrganizationInclude;

function toListWhere(filter: OrganizationListFilter): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {};
  if (filter.memberUserId) {
    where.users = { some: { userId: filter.memberUserId } };
  }
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: "insensitive" } },
      { code: { contains: filter.search, mode: "insensitive" } },
      { legalName: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export const organizationModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.organization.findUnique({ where: { id } });
  },

  findByCode(code: string, db: DbClient = prisma) {
    return db.organization.findUnique({ where: { code } });
  },

  findManyWithSummary(filter: OrganizationListFilter, db: DbClient = prisma) {
    return db.organization.findMany({
      where: toListWhere(filter),
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findByIdWithDetails(id: string, db: DbClient = prisma) {
    return db.organization.findUnique({ where: { id }, include: detailInclude });
  },

  findByIdWithMembers(id: string, db: DbClient = prisma) {
    return db.organization.findUnique({ where: { id }, include: { users: true } });
  },

  findByIdForStats(id: string, db: DbClient = prisma) {
    return db.organization.findUnique({ where: { id }, include: statsInclude });
  },

  create(data: Prisma.OrganizationUncheckedCreateInput, db: DbClient = prisma) {
    return db.organization.create({ data });
  },

  update(id: string, data: Prisma.OrganizationUncheckedUpdateInput, db: DbClient = prisma) {
    return db.organization.update({ where: { id }, data });
  },

  addMember(
    data: Prisma.OrganizationUserUncheckedCreateInput,
    db: DbClient = prisma
  ) {
    return db.organizationUser.create({ data });
  },

  // Cross-entity aggregates over the organization's location tenants.
  async getTenantsActivity(tenantIds: string[], db: DbClient = prisma) {
    const [tablesCount, roomsCount, orders] = await Promise.all([
      db.table.count({ where: { tenantId: { in: tenantIds } } }),
      db.room.count({ where: { tenantId: { in: tenantIds } } }),
      db.order.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { tenantId: true, grandTotal: true, status: true },
      }),
    ]);
    return { tablesCount, roomsCount, orders };
  },
};
