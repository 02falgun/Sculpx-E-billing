import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { TableStatus } from "@prisma/client";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";

const createTableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required").max(50),
  displayName: z.string().min(1, "Display name is required").max(100),
  capacity: z.coerce.number().min(1).max(50).default(4),
  section: z.string().default("Main Dining"),
});

const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  capacity: z.coerce.number().min(1).max(50).optional(),
  section: z.string().optional(),
  status: z.nativeEnum(TableStatus).optional(),
  isActive: z.boolean().optional(),
});

export const tableRoutes: FastifyPluginAsync = async (fastify) => {
  // Public customer menu accesses tables read-only via QR resolution or staff authorization
  // For admin/staff endpoints, authenticate hook is applied
  fastify.addHook("preHandler", async (req, reply) => {
    if (req.headers.authorization) {
      await authenticate(req, reply);
    }
  });

  /**
   * GET /
   * List restaurant tables for tenant.
   */
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    let tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      // If customer requested via QR header
      const qrToken = req.headers["x-qr-token"] as string | undefined;
      if (qrToken) {
        const qr = await prisma.qrCode.findUnique({ where: { token: qrToken } });
        if (qr) tenantId = qr.tenantId;
      }
    }

    if (!tenantId) {
      throw new AppError("Authentication or valid QR token context required", 401, "UNAUTHORIZED");
    }

    const query = req.query as { includeInactive?: string; section?: string };
    const includeInactive = query?.includeInactive === "true";

    const tables = await prisma.table.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(query?.section ? { section: query.section } : {}),
      },
      include: {
        qrCodes: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { tableNumber: "asc" },
    });

    const formatted = tables.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      tableNumber: t.tableNumber,
      displayName: t.displayName,
      section: t.section,
      capacity: t.capacity,
      status: t.status === "VACANT" ? "AVAILABLE" : t.status,
      isActive: t.isActive,
      qrToken: t.qrCodes[0]?.token || "",
      activeOrderId: t.currentOrderId || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return formatSuccessResponse(formatted, req);
  });

  /**
   * POST /
   * Create a new dining table and generate a unique QR code.
   */
  fastify.post(
    "/",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const parseResult = createTableSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const data = parseResult.data;

      // Check uniqueness within caller's tenant
      const existing = await prisma.table.findUnique({
        where: {
          tenantId_tableNumber: {
            tenantId: caller.tenantId,
            tableNumber: data.tableNumber,
          },
        },
      });

      if (existing) {
        throw new AppError(
          `Table number '${data.tableNumber}' already exists in your restaurant`,
          409,
          "TABLE_EXISTS"
        );
      }

      const qrToken = `tbl-${caller.tenantId.slice(0, 6)}-${data.tableNumber.toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`;

      const { table, qr } = await prisma.$transaction(async (tx) => {
        const t = await tx.table.create({
          data: {
            tenantId: caller.tenantId,
            tableNumber: data.tableNumber,
            displayName: data.displayName,
            capacity: data.capacity,
            section: data.section,
            status: TableStatus.VACANT,
            isActive: true,
          },
        });

        const q = await tx.qrCode.create({
          data: {
            tenantId: caller.tenantId,
            type: "TABLE",
            tableId: t.id,
            token: qrToken,
            isActive: true,
          },
        });

        return { table: t, qr: q };
      });

      await auditService.record({
        tenantId: caller.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "TABLE_CREATED",
        resource: "tables",
        resourceId: table.id,
        details: { tableNumber: table.tableNumber, capacity: table.capacity, section: table.section },
        ipAddress: req.ip,
      });

      return reply.status(201).send(
        formatSuccessResponse(
          {
            id: table.id,
            tenantId: table.tenantId,
            tableNumber: table.tableNumber,
            displayName: table.displayName,
            section: table.section,
            capacity: table.capacity,
            status: "AVAILABLE",
            isActive: table.isActive,
            qrToken: qr.token,
            createdAt: table.createdAt.toISOString(),
            updatedAt: table.updatedAt.toISOString(),
          },
          req,
          "Dining table created successfully"
        )
      );
    }
  );

  /**
   * GET /:id
   * Get single table details.
   */
  fastify.get("/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        qrCodes: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!table) {
      throw new AppError("Table not found", 404, "NOT_FOUND");
    }

    return formatSuccessResponse(
      {
        id: table.id,
        tenantId: table.tenantId,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        section: table.section,
        capacity: table.capacity,
        status: table.status === "VACANT" ? "AVAILABLE" : table.status,
        isActive: table.isActive,
        qrToken: table.qrCodes[0]?.token || "",
        activeOrderId: table.currentOrderId || undefined,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
      },
      req
    );
  });

  /**
   * PATCH /:id
   * Update table details (capacity, section, status, active).
   */
  fastify.patch(
    "/:id",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const existing = await prisma.table.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Table not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const parseResult = updateTableSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError("Validation failed", 400, "VALIDATION_FAILED");
      }

      const data = parseResult.data;

      // Check tableNumber uniqueness if changing
      if (data.tableNumber && data.tableNumber !== existing.tableNumber) {
        const dup = await prisma.table.findUnique({
          where: {
            tenantId_tableNumber: {
              tenantId: existing.tenantId,
              tableNumber: data.tableNumber,
            },
          },
        });
        if (dup) {
          throw new AppError(
            `Table number '${data.tableNumber}' is already in use`,
            409,
            "TABLE_EXISTS"
          );
        }
      }

      const updated = await prisma.table.update({
        where: { id },
        data: {
          ...(data.tableNumber ? { tableNumber: data.tableNumber } : {}),
          ...(data.displayName ? { displayName: data.displayName } : {}),
          ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
          ...(data.section ? { section: data.section } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        include: {
          qrCodes: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
        },
      });

      await auditService.record({
        tenantId: existing.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "TABLE_UPDATED",
        resource: "tables",
        resourceId: id,
        details: data,
        ipAddress: req.ip,
      });

      return formatSuccessResponse(
        {
          id: updated.id,
          tenantId: updated.tenantId,
          tableNumber: updated.tableNumber,
          displayName: updated.displayName,
          section: updated.section,
          capacity: updated.capacity,
          status: updated.status === "VACANT" ? "AVAILABLE" : updated.status,
          isActive: updated.isActive,
          qrToken: updated.qrCodes[0]?.token || "",
          activeOrderId: updated.currentOrderId || undefined,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        req,
        "Table updated successfully"
      );
    }
  );

  /**
   * PATCH /:id/status
   * Fast status transition.
   */
  fastify.patch(
    "/:id/status",
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const { status } = req.body;
      const prismaStatus =
        status === "AVAILABLE" ? TableStatus.VACANT : (status as TableStatus);

      const updated = await prisma.table.update({
        where: { id },
        data: { status: prismaStatus },
        include: {
          qrCodes: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
        },
      });

      return formatSuccessResponse(
        {
          id: updated.id,
          tenantId: updated.tenantId,
          tableNumber: updated.tableNumber,
          displayName: updated.displayName,
          section: updated.section,
          capacity: updated.capacity,
          status: updated.status === "VACANT" ? "AVAILABLE" : updated.status,
          isActive: updated.isActive,
          qrToken: updated.qrCodes[0]?.token || "",
          activeOrderId: updated.currentOrderId || undefined,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        req,
        "Table status updated"
      );
    }
  );

  /**
   * POST /:id/qr/rotate
   * Generate a fresh secure QR token and invalidate the old token.
   */
  fastify.post(
    "/:id/qr/rotate",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        throw new AppError("Table not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && table.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const newToken = `tbl-${table.tenantId.slice(0, 6)}-${table.tableNumber.toLowerCase()}-${crypto.randomBytes(6).toString("hex")}`;

      const newQr = await prisma.$transaction(async (tx) => {
        // Deactivate previous QRs for this table
        await tx.qrCode.updateMany({
          where: { tableId: id },
          data: { isActive: false },
        });

        return tx.qrCode.create({
          data: {
            tenantId: table.tenantId,
            type: "TABLE",
            tableId: id,
            token: newToken,
            isActive: true,
          },
        });
      });

      await auditService.record({
        tenantId: table.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "QR_TOKEN_ROTATED",
        resource: "tables",
        resourceId: id,
        details: { tableNumber: table.tableNumber, newQrId: newQr.id },
        ipAddress: req.ip,
      });

      return reply.status(200).send(
        formatSuccessResponse(
          { tableId: id, qrToken: newQr.token },
          req,
          "Table QR code token rotated successfully"
        )
      );
    }
  );

  /**
   * DELETE /:id
   * Soft-deactivate a table.
   */
  fastify.delete(
    "/:id",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        throw new AppError("Table not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && table.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      // Prevent deactivating occupied table
      if (table.status === TableStatus.OCCUPIED || table.currentOrderId) {
        throw new AppError(
          "Cannot deactivate table while it is currently occupied with active dining sessions",
          400,
          "TABLE_OCCUPIED"
        );
      }

      await prisma.$transaction([
        prisma.table.update({
          where: { id },
          data: { isActive: false, status: TableStatus.VACANT },
        }),
        prisma.qrCode.updateMany({
          where: { tableId: id },
          data: { isActive: false },
        }),
      ]);

      await auditService.record({
        tenantId: table.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "TABLE_DEACTIVATED",
        resource: "tables",
        resourceId: id,
        details: { tableNumber: table.tableNumber },
        ipAddress: req.ip,
      });

      return reply
        .status(200)
        .send(formatSuccessResponse(null, req, "Dining table deactivated successfully"));
    }
  );
};
