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
