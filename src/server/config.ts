import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  host: string;
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  redisUrl?: string;
  publicBaseUrl: string;
  clientOrigin: string;
  disconnectGraceMs: number;
  resendApiKey?: string;
  emailFrom: string;
  oidc: OidcConfig | null;
}

export interface OidcConfig {
  providerId: string;
  providerName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export function loadConfig(): ServerConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const host = process.env.HOST?.trim() || (nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1");
  const port = readInteger("PORT", 3000, 1, 65535);
  const jwtSecret = process.env.JWT_SECRET?.trim() || "secret";
  const publicBaseUrl = readUrl("PUBLIC_BASE_URL", `http://localhost:${port}`);
  const clientOrigin = readUrl(
    "CLIENT_ORIGIN",
    nodeEnv === "production" ? publicBaseUrl : "http://localhost:8080",
  );

  if (nodeEnv === "production" && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }

  return {
    host,
    port,
    nodeEnv,
    jwtSecret,
    redisUrl: process.env.REDIS_URL?.trim() || undefined,
    publicBaseUrl,
    clientOrigin,
    disconnectGraceMs: readInteger("DISCONNECT_GRACE_MS", 30000, 0, 300000),
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM ?? "Quattro <onboarding@resend.dev>",
    oidc: loadOidcConfig(publicBaseUrl),
  };
}

function loadOidcConfig(publicBaseUrl: string): OidcConfig | null {
  const issuerUrl = process.env.OIDC_ISSUER_URL?.trim();
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();

  if (!issuerUrl || !clientId || !clientSecret) {
    return null;
  }

  const providerName = process.env.OIDC_PROVIDER_NAME?.trim() || "Single Sign-On";
  const providerId = normalizeProviderId(process.env.OIDC_PROVIDER_ID?.trim() || providerName);
  const scopes = (process.env.OIDC_SCOPES ?? "openid profile email")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    providerId,
    providerName,
    issuerUrl: issuerUrl.replace(/\/+$/, ""),
    clientId,
    clientSecret,
    redirectUri: `${publicBaseUrl}/auth/oidc/callback`,
    scopes: scopes.length > 0 ? scopes : ["openid", "profile", "email"],
  };
}

function normalizeProviderId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oidc";
}

function readInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const rawValue = process.env[name]?.trim();
  const value = rawValue ? Number(rawValue) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function readUrl(name: string, fallback: string): string {
  const value = (process.env[name]?.trim() || fallback).replace(/\/+$/, "");
  try {
    return new URL(value).toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
}
