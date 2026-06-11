import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./databaseUrl";

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Database URL is not configured.");
  }

  prisma ??= new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  return prisma;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export async function checkDatabaseHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return { configured: false, healthy: false };
  }

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return { configured: true, healthy: true };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      error: error instanceof Error ? error.message : "Database health check failed.",
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (!prisma) {
    return;
  }
  await prisma.$disconnect();
  prisma = null;
}
