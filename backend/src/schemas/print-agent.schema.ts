import { z } from "zod";

export const MAX_PRINT_JOB_FRAME_BYTES = 64 * 1024; // 64 KB maximum print-job frame size
export const MAX_CONTROL_FRAME_BYTES = 8 * 1024;    // 8 KB maximum control / ack frame size

// REST API Schemas
export const registerPrintAgentBodySchema = z.object({
  name: z.string().min(2, "Device name must be at least 2 characters").max(100),
  deviceId: z.string().min(3, "Device ID must be at least 3 characters").max(100),
  permittedPrinterIds: z.array(z.string().uuid("Invalid printer ID format")).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type RegisterPrintAgentBody = z.infer<typeof registerPrintAgentBodySchema>;

export const updatePrintAgentBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  permittedPrinterIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdatePrintAgentBody = z.infer<typeof updatePrintAgentBodySchema>;

export const printAgentIdParamSchema = z.object({
  id: z.string().uuid("Invalid print agent ID format"),
});

export type PrintAgentIdParam = z.infer<typeof printAgentIdParamSchema>;

export const bindPrintersBodySchema = z.object({
  printerIds: z.array(z.string().uuid("Invalid printer ID format")),
});

export type BindPrintersBody = z.infer<typeof bindPrintersBodySchema>;

// WebSocket Frame Schemas

export const agentHelloPayloadSchema = z.object({
  type: z.literal("AGENT_HELLO"),
  deviceId: z.string().min(1, "Device ID required"),
  apiKey: z.string().min(8, "API Key required"),
  version: z.string().max(50).optional(),
  hostname: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentHelloPayload = z.infer<typeof agentHelloPayloadSchema>;

export const agentPingPayloadSchema = z.object({
  type: z.literal("AGENT_PING"),
  timestamp: z.union([z.number(), z.string()]).optional(),
});

export const agentAckPayloadSchema = z.object({
  type: z.literal("AGENT_ACK"),
  requestId: z.string().uuid(),
  jobId: z.string().uuid(),
  stage: z.enum(["RECEIVED", "PRINTED", "FAILED", "UNCERTAIN"]),
  bytesWritten: z.number().int().nonnegative().optional(),
  error: z.string().max(500).optional(),
  timestamp: z.string().datetime().optional(),
});

export type AgentAckPayload = z.infer<typeof agentAckPayloadSchema>;

export const agentHealthCheckResultPayloadSchema = z.object({
  type: z.literal("HEALTH_CHECK_RESULT"),
  requestId: z.string().uuid(),
  printerId: z.string().uuid(),
  isOnline: z.boolean(),
  latencyMs: z.number().nonnegative().optional(),
  error: z.string().max(500).optional(),
});

export type AgentHealthCheckResultPayload = z.infer<typeof agentHealthCheckResultPayloadSchema>;

export const agentInboundFrameSchema = z.discriminatedUnion("type", [
  agentHelloPayloadSchema,
  agentPingPayloadSchema,
  agentAckPayloadSchema,
  agentHealthCheckResultPayloadSchema,
]);

export type AgentInboundFrame = z.infer<typeof agentInboundFrameSchema>;
