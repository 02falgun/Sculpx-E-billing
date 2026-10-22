import type { FastifyRequest } from "fastify";
import type { ActorContext } from "../types/auth.types.js";
import { UnauthorizedError } from "./errors.js";

/**
 * Build the ActorContext for an authenticated request.
 */
export function getActor(request: FastifyRequest): ActorContext {
  const user = request.authenticatedUser;
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  return { user, ipAddress: request.ip };
}
