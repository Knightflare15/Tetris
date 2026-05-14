import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  clientOrigin: string;
  disconnectGraceMs: number;
}

export function loadConfig(): ServerConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";

  if (nodeEnv === "production" && jwtSecret === "dev-secret-change-me") {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv,
    jwtSecret,
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:8080",
    disconnectGraceMs: Number(process.env.DISCONNECT_GRACE_MS ?? 30000),
  };
}
