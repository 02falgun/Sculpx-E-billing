import type { WebSocket } from "ws";

export interface ConnectedAgentDevice {
  agentId: string;
  deviceId: string;
  tenantId: string;
  name: string;
  socket: WebSocket;
  remoteAddress: string;
  connectedAt: Date;
  lastHeartbeatAt: Date;
  version?: string;
  permittedPrinterIds: Set<string>;
}

export interface RegisterPrintAgentInput {
  name: string;
  deviceId: string;
  permittedPrinterIds?: string[];
  metadata?: Record<string, unknown>;
}

// ── Server → agent wire protocol (inbound frames are Zod schemas in print-agent.validation) ──

export type AgentErrorCode =
  | "FRAME_TOO_LARGE"
  | "AUTH_FAILED"
  | "UNAUTHENTICATED"
  | "INVALID_SCHEMA"
  | "MALFORMED_JSON";

export interface AgentWelcomeFrame {
  type: "AGENT_WELCOME";
  agentId: string;
  tenantId: string;
  heartbeatIntervalMs: number;
  maxPayloadBytes: number;
  permittedPrinterIds: string[];
}

export interface AgentErrorFrame {
  type: "AGENT_ERROR";
  code: AgentErrorCode;
  message: string;
}

export interface AgentPongFrame {
  type: "AGENT_PONG";
  timestamp: string;
}

export interface PrintRequestFrame {
  type: "PRINT_REQUEST";
  requestId: string;
  jobId: string;
  jobType: string;
  printerId: string;
  printerName: string;
  printerHost: string;
  printerPort: number;
  paperWidthMm: number;
  isReprint: boolean;
  payloadBase64: string;
  bytesLength: number;
  timestamp: string;
}

export interface HealthCheckRequestFrame {
  type: "HEALTH_CHECK_REQUEST";
  requestId: string;
  printerId: string;
  host: string;
  port: number;
}

export type AgentOutboundFrame =
  | AgentWelcomeFrame
  | AgentErrorFrame
  | AgentPongFrame
  | PrintRequestFrame
  | HealthCheckRequestFrame;
