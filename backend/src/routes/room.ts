import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { RoomStatus } from "@prisma/client";

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    let tenantId = "e1b1d1f0-0000-4000-8000-000000000001";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = await req.jwtVerify<{ tenantId?: string }>();
        if (decoded?.tenantId) tenantId = decoded.tenantId;
      } catch {}
    }

    const rooms = await prisma.room.findMany({
      where: { tenantId },
      include: { qrCodes: true },
      orderBy: { roomNumber: "asc" },
    });

    const formatted = rooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      guestName: r.guestName || undefined,
      status: r.status,
      qrToken: r.qrCodes[0]?.token || `room-token-${r.roomNumber}`,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return formatSuccessResponse(formatted, req);
  });

  fastify.get(
    "/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const room = await prisma.room.findFirst({
        where: { id },
        include: { qrCodes: true },
      });
      if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
      }
      return formatSuccessResponse(
        {
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          guestName: room.guestName || undefined,
          status: room.status,
          qrToken: room.qrCodes[0]?.token || "",
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        },
        req
      );
    }
  );

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
        include: { qrCodes: true },
      });
      return formatSuccessResponse(
        {
          id: updated.id,
          roomNumber: updated.roomNumber,
          floor: updated.floor,
          guestName: updated.guestName || undefined,
          status: updated.status,
          qrToken: updated.qrCodes[0]?.token || "",
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        req,
        "Room status updated"
      );
    }
  );
};
