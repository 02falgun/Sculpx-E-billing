export interface AgentConfig {
  cloudUrl: string;
  deviceId: string;
  apiKey: string;
  allowedHosts: string[]; // Explicit list or ["*"] for any private LAN
  allowedPorts: number[];
  allowPrivateSubnetsOnly: boolean;
  connectTimeoutMs: number;
  writeTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxPayloadBytes: number;
  logLevel: "debug" | "info" | "warn" | "error";
  allowLocalhostForTesting?: boolean;
  simulatedUncertain?: boolean;
}

export function loadAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  const env = process.env;

  const rawHosts = env.ALLOWED_PRINTER_HOSTS || "";
  const allowedHosts = rawHosts
    ? rawHosts.split(",").map((h: string) => h.trim()).filter(Boolean)
    : ["*"]; // Default allows private LAN IPs verified by subnet validator

  const rawPorts = env.ALLOWED_PRINTER_PORTS || "9100,9101,9102";
  const allowedPorts = rawPorts
    .split(",")
    .map((p: string) => Number.parseInt(p.trim(), 10))
    .filter((p: number) => !Number.isNaN(p) && p > 0 && p < 65536);

  return {
    cloudUrl: overrides.cloudUrl || env.PRINT_AGENT_CLOUD_URL || "ws://localhost:8000/ws/print-agent",
    deviceId: overrides.deviceId || env.PRINT_AGENT_DEVICE_ID || "agent-dev-01",
    apiKey: overrides.apiKey || env.PRINT_AGENT_API_KEY || "",
    allowedHosts: overrides.allowedHosts || allowedHosts,
    allowedPorts: overrides.allowedPorts || allowedPorts,
    allowPrivateSubnetsOnly: overrides.allowPrivateSubnetsOnly ?? (env.ALLOW_PRIVATE_SUBNETS_ONLY !== "false"),
    connectTimeoutMs: overrides.connectTimeoutMs || Number(env.PRINTER_CONNECT_TIMEOUT_MS) || 3000,
    writeTimeoutMs: overrides.writeTimeoutMs || Number(env.PRINTER_WRITE_TIMEOUT_MS) || 5000,
    heartbeatIntervalMs: overrides.heartbeatIntervalMs || Number(env.AGENT_HEARTBEAT_INTERVAL_MS) || 15000,
    maxPayloadBytes: overrides.maxPayloadBytes || 64 * 1024, // 64 KB
    logLevel: overrides.logLevel || (env.AGENT_LOG_LEVEL as any) || "info",
    allowLocalhostForTesting: overrides.allowLocalhostForTesting ?? false,
    simulatedUncertain: overrides.simulatedUncertain ?? false,
  };
}
