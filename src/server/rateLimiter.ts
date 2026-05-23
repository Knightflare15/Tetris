import type express from "express";
import { getRedisClient, isRedisConfigured } from "./redis";

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

export interface RateLimiter {
  check(scope: string, subject: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export function createRateLimiter(redisUrl: string | undefined): RateLimiter {
  return isRedisConfigured(redisUrl) ? new RedisRateLimiter(redisUrl) : new MemoryRateLimiter();
}

class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redisUrl: string) {}

  async check(scope: string, subject: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const { bucketKey, resetAt } = bucketFor(scope, subject, windowMs);
    const client = await getRedisClient(this.redisUrl);
    const replies = await client.multi().incr(bucketKey).pExpire(bucketKey, windowMs * 2).exec();
    const count = Number(replies?.[0] ?? 0);
    const remaining = Math.max(0, limit - count);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return {
      allowed: count <= limit,
      limit,
      remaining,
      resetAt,
      retryAfterSeconds,
    };
  }
}

class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitEntry>();

  async check(scope: string, subject: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const { bucketKey, resetAt } = bucketFor(scope, subject, windowMs);
    const now = Date.now();
    const existing = this.buckets.get(bucketKey);
    const nextCount = existing && existing.expiresAt > now ? existing.count + 1 : 1;

    this.buckets.set(bucketKey, {
      count: nextCount,
      expiresAt: resetAt,
    });

    const remaining = Math.max(0, limit - nextCount);
    return {
      allowed: nextCount <= limit,
      limit,
      remaining,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
}

export async function enforceRateLimit(
  limiter: RateLimiter,
  req: express.Request,
  res: express.Response,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const subject = clientIdentifier(req);
  const result = await limiter.check(scope, subject, limit, windowMs);
  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.floor(result.resetAt / 1000)));

  if (result.allowed) {
    return true;
  }

  res.setHeader("Retry-After", String(result.retryAfterSeconds));
  res.status(429).json({ message: "Too many requests. Please try again shortly." });
  return false;
}

function bucketFor(scope: string, subject: string, windowMs: number): { bucketKey: string; resetAt: number } {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  return {
    bucketKey: `ratelimit:${scope}:${subject}:${windowStart}`,
    resetAt: windowStart + windowMs,
  };
}

function clientIdentifier(req: express.Request): string {
  return req.ip?.trim() || req.socket.remoteAddress || "unknown-client";
}
