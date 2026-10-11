import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { TableStatus } from "@prisma/client";

export const tableRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    let tenantId = "e1b1d1f0-0000-4000-8000-000000000001";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = await req.jwtVerify<{ tenantId?: string }>();
        if (decoded?.tenantId) tenantId = decoded.tenantId;
      } catch {}
    }

    const tables = await prisma.table.findMany({
      where: { tenantId },
      include: { qrCodes: true },
      orderBy: { tableNumber: "asc" },
    });

    const formatted = tables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      section: t.section,
      capacity: t.capacity,
      status: t.status === "VACANT" ? "AVAILABLE" : t.status,
      qrToken: t.qrCodes[0]?.token || `table-token-${t.tableNumber.replace(/\D/g, "") || "1"}`,
      activeOrderId: t.currentOrderId || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return formatSuccessResponse(formatted, req);
  });

  fastify.get(
    "/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const table = await prisma.table.findFirst({
        where: { id },
        include: { qrCodes: true },
      });
      if (!table) {
        throw new AppError("Table not found", 404, "NOT_FOUND");
      }
      return formatSuccessResponse(
        {
          id: table.id,
          tableNumber: table.tableNumber,
          section: table.section,
          capacity: table.capacity,
          status: table.status === "VACANT" ? "AVAILABLE" : table.status,
          qrToken: table.qrCodes[0]?.token || "",
          activeOrderId: table.currentOrderId || undefined,
          createdAt: table.createdAt.toISOString(),
          updatedAt: table.updatedAt.toISOString(),
        },
        req
      );
    }
  );

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
        include: { qrCodes: true },
      });
      return formatSuccessResponse(
        {
          id: updated.id,
          tableNumber: updated.tableNumber,
          section: updated.section,
          capacity: updated.capacity,
          status: updated.status === "VACANT" ? "AVAILABLE" : updated.status,
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
};
