import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { auditService } from "../services/audit.service.js";
import type { AuditListQuery } from "../types/audit.types.js";

export const auditController = {
  async listLogs(request: FastifyRequest, reply: FastifyReply) {
    const result = await auditService.listLogsForActor(
      getActor(request),
      request.query as AuditListQuery
    );
    return sendSuccess(request, reply, result);
  },
};
