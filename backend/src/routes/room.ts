import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { RoomStatus } from "@prisma/client";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").max(50),
  floor: z.string().min(1, "Floor is required").max(50),
  roomType: z.string().default("STANDARD"),
  capacity: z.coerce.number().min(1).max(20).default(2),
});

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).max(50).optional(),
  floor: z.string().min(1).max(50).optional(),
  roomType: z.string().optional(),
  capacity: z.coerce.number().min(1).max(20).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  guestName: z.string().optional().nullable(),
  folioId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (req, reply) => {
    if (req.headers.authorization) {
      await authenticate(req, reply);
    }
  });

  /**
   * GET /
   * List rooms for tenant.
   */
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    let tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      const qrToken = req.headers["x-qr-token"] as string | undefined;
      if (qrToken) {
        const qr = await prisma.qrCode.findUnique({ where: { token: qrToken } });
        if (qr) tenantId = qr.tenantId;
      }
    }

    if (!tenantId) {
      throw new AppError("Authentication or valid QR token context required", 401, "UNAUTHORIZED");
    }

    const query = req.query as { includeInactive?: string; floor?: string };
    const includeInactive = query?.includeInactive === "true";

    const rooms = await prisma.room.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(query?.floor ? { floor: query.floor } : {}),
      },
      include: {
        qrCodes: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { roomNumber: "asc" },
    });

    const formatted = rooms.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      roomNumber: r.roomNumber,
      floor: r.floor,
      roomType: r.roomType || "STANDARD",
      capacity: r.capacity,
      guestName: r.guestName || undefined,
      folioId: r.folioId || undefined,
      status: r.status,
      isActive: r.isActive,
      qrToken: r.qrCodes[0]?.token || "",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return formatSuccessResponse(formatted, req);
  });

  /**
   * POST /
   * Create a new room and generate a unique QR code.
   */
  fastify.post(
    "/",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const parseResult = createRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const data = parseResult.data;

      // Check roomNumber uniqueness within tenant
      const existing = await prisma.room.findUnique({
        where: {
          tenantId_roomNumber: {
            tenantId: caller.tenantId,
            roomNumber: data.roomNumber,
          },
        },
      });

      if (existing) {
        throw new AppError(
          `Room number '${data.roomNumber}' already exists in your property`,
          409,
          "ROOM_EXISTS"
        );
      }

      const qrToken = `rm-${caller.tenantId.slice(0, 6)}-${data.roomNumber.toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`;

      const { room, qr } = await prisma.$transaction(async (tx) => {
        const r = await tx.room.create({
          data: {
            tenantId: caller.tenantId,
            roomNumber: data.roomNumber,
            floor: data.floor,
            roomType: data.roomType,
            capacity: data.capacity,
            status: RoomStatus.VACANT,
            isActive: true,
          },
        });

        const q = await tx.qrCode.create({
          data: {
            tenantId: caller.tenantId,
            type: "ROOM",
            roomId: r.id,
            token: qrToken,
            isActive: true,
          },
        });

        return { room: r, qr: q };
      });

      await auditService.record({
        tenantId: caller.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "ROOM_CREATED",
        resource: "rooms",
        resourceId: room.id,
        details: { roomNumber: room.roomNumber, floor: room.floor, roomType: room.roomType },
        ipAddress: req.ip,
      });

      return reply.status(201).send(
        formatSuccessResponse(
          {
            id: room.id,
            tenantId: room.tenantId,
            roomNumber: room.roomNumber,
            floor: room.floor,
            roomType: room.roomType,
            capacity: room.capacity,
            status: room.status,
            isActive: room.isActive,
            qrToken: qr.token,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
          },
          req,
          "Guestroom created successfully"
        )
      );
    }
  );

  /**
   * GET /:id
   * Get single room details.
   */
  fastify.get("/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        qrCodes: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!room) {
      throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    return formatSuccessResponse(
      {
        id: room.id,
        tenantId: room.tenantId,
        roomNumber: room.roomNumber,
        floor: room.floor,
        roomType: room.roomType || "STANDARD",
        capacity: room.capacity,
        guestName: room.guestName || undefined,
        folioId: room.folioId || undefined,
        status: room.status,
        isActive: room.isActive,
        qrToken: room.qrCodes[0]?.token || "",
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
      req
    );
  });

  /**
   * PATCH /:id
   * Update room details.
   */
  fastify.patch(
    "/:id",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const existing = await prisma.room.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const parseResult = updateRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError("Validation failed", 400, "VALIDATION_FAILED");
      }

      const data = parseResult.data;

      // Check roomNumber uniqueness if changing
      if (data.roomNumber && data.roomNumber !== existing.roomNumber) {
        const dup = await prisma.room.findUnique({
          where: {
            tenantId_roomNumber: {
              tenantId: existing.tenantId,
              roomNumber: data.roomNumber,
            },
          },
        });
        if (dup) {
          throw new AppError(
            `Room number '${data.roomNumber}' is already in use`,
            409,
            "ROOM_EXISTS"
          );
        }
      }

      const updated = await prisma.room.update({
        where: { id },
        data: {
          ...(data.roomNumber ? { roomNumber: data.roomNumber } : {}),
          ...(data.floor ? { floor: data.floor } : {}),
          ...(data.roomType ? { roomType: data.roomType } : {}),
          ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.guestName !== undefined ? { guestName: data.guestName } : {}),
          ...(data.folioId !== undefined ? { folioId: data.folioId } : {}),
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
        action: "ROOM_UPDATED",
        resource: "rooms",
        resourceId: id,
        details: data,
        ipAddress: req.ip,
      });

      return formatSuccessResponse(
        {
          id: updated.id,
          tenantId: updated.tenantId,
          roomNumber: updated.roomNumber,
          floor: updated.floor,
          roomType: updated.roomType,
          capacity: updated.capacity,
          guestName: updated.guestName || undefined,
          folioId: updated.folioId || undefined,
          status: updated.status,
          isActive: updated.isActive,
          qrToken: updated.qrCodes[0]?.token || "",
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        req,
        "Room updated successfully"
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
      req: FastifyRequest<{ Params: { id: string }; Body: { status: RoomStatus } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await prisma.room.update({
        where: { id },
        data: { status },
        include: { qrCodes: { where: { isActive: true }, orderBy: { createdAt: "desc" } } },
      });
      return formatSuccessResponse(
        {
          id: updated.id,
          tenantId: updated.tenantId,
          roomNumber: updated.roomNumber,
          floor: updated.floor,
          roomType: updated.roomType,
          capacity: updated.capacity,
          guestName: updated.guestName || undefined,
          folioId: updated.folioId || undefined,
          status: updated.status,
          isActive: updated.isActive,
          qrToken: updated.qrCodes[0]?.token || "",
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        req,
        "Room status updated"
      );
    }
  );

  /**
   * POST /:id/qr/rotate
   * Generate fresh secure room QR token.
   */
  fastify.post(
    "/:id/qr/rotate",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const room = await prisma.room.findUnique({ where: { id } });
      if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && room.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const newToken = `rm-${room.tenantId.slice(0, 6)}-${room.roomNumber.toLowerCase()}-${crypto.randomBytes(6).toString("hex")}`;

      const newQr = await prisma.$transaction(async (tx) => {
        await tx.qrCode.updateMany({
          where: { roomId: id },
          data: { isActive: false },
        });

        return tx.qrCode.create({
          data: {
            tenantId: room.tenantId,
            type: "ROOM",
            roomId: id,
            token: newToken,
            isActive: true,
          },
        });
      });

      await auditService.record({
        tenantId: room.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "QR_TOKEN_ROTATED",
        resource: "rooms",
        resourceId: id,
        details: { roomNumber: room.roomNumber, newQrId: newQr.id },
        ipAddress: req.ip,
      });

      return reply.status(200).send(
        formatSuccessResponse(
          { roomId: id, qrToken: newQr.token },
          req,
          "Room QR code token rotated successfully"
        )
      );
    }
  );

  /**
   * DELETE /:id
   * Soft-deactivate a room.
   */
  fastify.delete(
    "/:id",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const caller = req.authenticatedUser!;
      const { id } = req.params as { id: string };

      const room = await prisma.room.findUnique({ where: { id } });
      if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && room.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      // Prevent deactivating occupied room
      if (room.status === RoomStatus.OCCUPIED || room.guestName) {
        throw new AppError(
          "Cannot deactivate room while it is currently occupied by an active guest",
          400,
          "ROOM_OCCUPIED"
        );
      }

      await prisma.$transaction([
        prisma.room.update({
          where: { id },
          data: { isActive: false, status: RoomStatus.VACANT },
        }),
        prisma.qrCode.updateMany({
          where: { roomId: id },
          data: { isActive: false },
        }),
      ]);

      await auditService.record({
        tenantId: room.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "ROOM_DEACTIVATED",
        resource: "rooms",
        resourceId: id,
        details: { roomNumber: room.roomNumber },
        ipAddress: req.ip,
      });

      return reply
        .status(200)
        .send(formatSuccessResponse(null, req, "Guestroom deactivated successfully"));
    }
  );
};
