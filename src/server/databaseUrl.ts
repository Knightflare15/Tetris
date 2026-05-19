export function getDatabaseUrl(): string | undefined {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  return configuredUrl || undefined;
}
