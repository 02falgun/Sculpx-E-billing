import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { roomController } from "../controllers/room.controller.js";

const roomManagers = requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER");
const roomAdmins = requireRoles("ADMIN", "SUPER_ADMIN");

// Authenticate only when an Authorization header is present
async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  if (request.headers.authorization) {
    await authenticate(request, reply);
  }
}

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", optionalAuthenticate);

  fastify.get("/", roomController.listRooms);
  fastify.post("/", { preHandler: [authenticate, roomManagers] }, roomController.createRoom);
  fastify.get("/:id", roomController.getRoom);
  fastify.patch("/:id", { preHandler: [authenticate, roomManagers] }, roomController.updateRoom);
  fastify.patch("/:id/status", roomController.updateRoomStatus);
  fastify.post(
    "/:id/qr/rotate",
    { preHandler: [authenticate, roomManagers] },
    roomController.rotateQrToken
  );
  fastify.delete("/:id", { preHandler: [authenticate, roomAdmins] }, roomController.deactivateRoom);
};
