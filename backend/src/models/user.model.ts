import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

const withPermissions = { permissions: { select: { permissionKey: true } } } as const;

/** Everything `authenticate` needs to build the request's AuthenticatedUser. */
const authContextInclude = {
  permissions: { select: { permissionKey: true } },
  locationAssignments: {
    include: {
      location: { select: { id: true, tenantId: true, status: true } },
    },
  },
  organizationMemberships: { select: { organizationId: true, role: true } },
} satisfies Prisma.UserInclude;

export const userModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { id } });
  },

  /** Just the user's id and tenantId. */
  findTenantRef(id: string, db: DbClient = prisma) {
    return db.user.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
  },

  findByIdWithPermissions(id: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { id }, include: withPermissions });
  },

  /** User with permissions, location assignments and organization memberships. */
  findByIdWithAuthContext(id: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { id }, include: authContextInclude });
  },

  findByEmail(email: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { email } });
  },

  findByEmailWithPermissions(email: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { email }, include: withPermissions });
  },

  /** All users, or only one tenant's when `tenantId` is given. */
  findManyWithPermissions(tenantId?: string, db: DbClient = prisma) {
    return db.user.findMany({
      where: tenantId === undefined ? {} : { tenantId },
      include: withPermissions,
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.UserUncheckedCreateInput, db: DbClient = prisma) {
    return db.user.create({ data });
  },

  update(id: string, data: Prisma.UserUncheckedUpdateInput, db: DbClient = prisma) {
    return db.user.update({ where: { id }, data });
  },

  updateWithPermissions(id: string, data: Prisma.UserUncheckedUpdateInput, db: DbClient = prisma) {
    return db.user.update({ where: { id }, data, include: withPermissions });
  },

  /** Bump tokenVersion to invalidate active sessions. */
  incrementTokenVersion(id: string, db: DbClient = prisma) {
    return db.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.user.delete({ where: { id } });
  },

  countActiveSuperAdminsExcept(id: string, db: DbClient = prisma) {
    return db.user.count({ where: { role: "SUPER_ADMIN", isActive: true, NOT: { id } } });
  },

  countActiveAdminsExcept(tenantId: string, id: string, db: DbClient = prisma) {
    return db.user.count({ where: { tenantId, role: "ADMIN", isActive: true, NOT: { id } } });
  },

  addPermissions(userId: string, permissionKeys: string[], db: DbClient = prisma) {
    return db.userPermission.createMany({
      data: permissionKeys.map((p) => ({ userId, permissionKey: p })),
      skipDuplicates: true,
    });
  },

  deletePermissions(userId: string, db: DbClient = prisma) {
    return db.userPermission.deleteMany({ where: { userId } });
  },
};
