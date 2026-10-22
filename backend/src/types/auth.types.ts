import type { Role } from "@prisma/client";

/** Claims signed into every staff JWT. */
export interface JwtClaims {
  sub: string;
  email: string;
  role: Role;
  tenantId: string;
  tokenVersion?: number;
}

/** The staff user resolved by the `authenticate` middleware for the current request. */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  phoneNumber?: string | null;
  isActive: boolean;
  tokenVersion: number;
  permissions: string[];
  authorizedTenantIds: string[];
  authorizedLocationIds: string[];
  authorizedOrganizationIds: string[];
  organizationRole?: string;
}

/**
 * Who is performing an operation. Controllers build it with `getActor(request)`
 * and pass it to services, so services never depend on the Fastify request.
 */
export interface ActorContext {
  user: AuthenticatedUser;
  ipAddress: string;
}
