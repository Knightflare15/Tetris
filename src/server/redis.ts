import { createClient } from "redis";
import { logger } from "./logger";

type AppRedisClient = ReturnType<typeof createClient>;

let redisClient: AppRedisClient | null = null;
let redisConnection: Promise<AppRedisClient> | null = null;

export function isRedisConfigured(redisUrl: string | undefined): redisUrl is string {
  return Boolean(redisUrl?.trim());
}

export async function getRedisClient(redisUrl: string): Promise<AppRedisClient> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnection) {
    return redisConnection;
  }

  const client = createClient({ url: redisUrl });
  client.on("error", (error) => {
    logger.error({ error }, "redis client error");
  });

  redisConnection = client.connect().then(() => {
    redisClient = client;
    logger.info("redis connected");
    return client;
  }).finally(() => {
    redisConnection = null;
  });

  return redisConnection;
}

export async function warmRedis(redisUrl: string): Promise<void> {
  const client = await getRedisClient(redisUrl);
  await client.ping();
}

export async function checkRedisHealth(redisUrl: string | undefined): Promise<{
  configured: boolean;
  healthy: boolean;
  error?: string;
}> {
  if (!isRedisConfigured(redisUrl)) {
    return {
      configured: false,
      healthy: false,
    };
  }

  try {
    const client = await getRedisClient(redisUrl);
    await client.ping();
    return {
      configured: true,
      healthy: true,
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      error: error instanceof Error ? error.message : "Redis health check failed.",
    };
  }
}
