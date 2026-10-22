import { checkDatabaseHealth } from "../database/prisma.js";

export const healthService = {
  getLiveness() {
    return {
      status: "HEALTHY",
      service: "sculpx-ebilling-backend",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  },

  async checkReadiness() {
    return checkDatabaseHealth();
  },
};
