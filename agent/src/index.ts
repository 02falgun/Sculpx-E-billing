import { loadAgentConfig } from "./config.js";
import { LocalPrintAgentClient } from "./client.js";

async function main() {
  const config = loadAgentConfig();

  console.log("=================================================");
  console.log("  SCULPX SECURE LOCAL PRINT AGENT (PHASE 6F)");
  console.log("=================================================");
  console.log(`  Device ID:         ${config.deviceId}`);
  console.log(`  Gateway URL:       ${config.cloudUrl}`);
  console.log(`  Allowed Ports:     ${config.allowedPorts.join(", ")}`);
  console.log(`  Allowed Hosts:     ${config.allowedHosts.join(", ")}`);
  console.log(`  Private LAN Only:  ${config.allowPrivateSubnetsOnly}`);
  console.log(`  Connect Timeout:   ${config.connectTimeoutMs}ms`);
  console.log(`  Write Timeout:     ${config.writeTimeoutMs}ms`);
  console.log("=================================================");

  if (!config.apiKey) {
    console.error("FATAL: PRINT_AGENT_API_KEY environment variable is required.");
    console.error("Enroll the agent via POST /api/v1/print-agents to generate an API key.");
    process.exit(1);
  }

  const client = new LocalPrintAgentClient(config);

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
    await client.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  client.start();
}

main().catch((err) => {
  console.error("Fatal error starting print agent:", err);
  process.exit(1);
});
