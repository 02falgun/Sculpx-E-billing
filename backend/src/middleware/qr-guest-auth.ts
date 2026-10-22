import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../lib/errors.js";
import { authenticate } from "./auth.js";
import { qrService } from "../services/qr.service.js";

/**
 * Menu operations require authenticated staff context or valid QR token context for reads.
 */
export async function menuQrGuestAuth(request: FastifyRequest, reply: FastifyReply) {
  // 1. Context endpoint is always public
  if (request.url.includes("/context/")) {
    return;
  }

  // 2. If Authorization header is present, verify staff JWT
  if (request.headers.authorization) {
    await authenticate(request, reply);
    return;
  }

  // 3. For read-only GET requests, allow resolution via x-qr-token or ?qrToken
  const query = request.query as { qrToken?: string } | undefined;
  const qrToken = (request.headers["x-qr-token"] || query?.qrToken) as string | undefined;
  if (request.method === "GET" && qrToken) {
    try {
      const validated = await qrService.resolveValidatedQrEntity(qrToken);
      request.authenticatedUser = {
        id: `guest-${validated.type.toLowerCase()}-${validated.qr.token}`,
        tenantId: validated.tenantId,
        email: `guest@${validated.type.toLowerCase()}.local`,
        name: `Guest (${validated.type})`,
        role: "WAITER",
        isActive: true,
        tokenVersion: 1,
        permissions: [],
        authorizedTenantIds: [validated.tenantId],
        authorizedLocationIds: [],
        authorizedOrganizationIds: [],
      };
      return;
    } catch {
      throw new UnauthorizedError("Invalid or expired QR token");
    }
  }

  // 4. Default: enforce staff authentication
  await authenticate(request, reply);
}
