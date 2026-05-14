const FALLBACK_DATABASE_URL =
  "sqlserver://tmason-server.database.windows.net:1433;database=tmason_db;user=tmasonadmin;password=Flare@101271;encrypt=true;trustServerCertificate=false";

export function getDatabaseUrl(): string | undefined {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  return configuredUrl || FALLBACK_DATABASE_URL;
}
