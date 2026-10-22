import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 20000,
    fileParallelism: false,
    env: {
      BOOTSTRAP_SECRET: "test-bootstrap-secret-token-32-chars-long-secure-suite",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../frontend/src"),
    },
  },
});
