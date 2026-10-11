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
  isReprint?: boolean;
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

export interface AgentWelcomeFrame {
  type: "AGENT_WELCOME";
  agentId: string;
  tenantId: string;
  heartbeatIntervalMs: number;
  maxPayloadBytes: number;
  permittedPrinterIds?: string[];
}

export interface AgentErrorFrame {
  type: "AGENT_ERROR";
  code: string;
  message: string;
}

export interface AgentPongFrame {
  type: "AGENT_PONG";
  timestamp: string;
}

export type GatewayInboundFrame =
  | PrintRequestFrame
  | HealthCheckRequestFrame
  | AgentWelcomeFrame
  | AgentErrorFrame
  | AgentPongFrame;

export interface AgentAckFrame {
  type: "AGENT_ACK";
  requestId: string;
  jobId: string;
  stage: "RECEIVED" | "PRINTED" | "FAILED" | "UNCERTAIN";
  bytesWritten?: number;
  error?: string;
  timestamp: string;
}

export interface AgentHealthCheckResultFrame {
  type: "HEALTH_CHECK_RESULT";
  requestId: string;
  printerId: string;
  isOnline: boolean;
  latencyMs?: number;
  error?: string;
}
