import { getRedisClient, isRedisConfigured } from "./redis";

interface StoredEntry {
  expiresAt: number;
  payload: string;
}

export interface TransientStore {
  delete(key: string): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, ttlMs: number): Promise<void>;
  takeJson<T>(key: string): Promise<T | null>;
}

export function createTransientStore(redisUrl: string | undefined): TransientStore {
  return isRedisConfigured(redisUrl) ? new RedisBackedTransientStore(redisUrl) : new MemoryTransientStore();
}

class RedisBackedTransientStore implements TransientStore {
  constructor(private readonly redisUrl: string) {}

  async setJson<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const client = await getRedisClient(this.redisUrl);
    await client.set(key, JSON.stringify(value), { PX: ttlMs });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = await getRedisClient(this.redisUrl);
    return parsePayload<T>(await client.get(key));
  }

  async takeJson<T>(key: string): Promise<T | null> {
    const client = await getRedisClient(this.redisUrl);
    return parsePayload<T>(await client.getDel(key));
  }

  async delete(key: string): Promise<void> {
    const client = await getRedisClient(this.redisUrl);
    await client.del(key);
  }
}

class MemoryTransientStore implements TransientStore {
  private readonly entries = new Map<string, StoredEntry>();

  async setJson<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.entries.set(key, {
      expiresAt: Date.now() + ttlMs,
      payload: JSON.stringify(value),
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    return this.read<T>(key, false);
  }

  async takeJson<T>(key: string): Promise<T | null> {
    return this.read<T>(key, true);
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  private read<T>(key: string, removeAfterRead: boolean): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return null;
    }
    if (removeAfterRead) {
      this.entries.delete(key);
    }
    return parsePayload<T>(entry.payload);
  }
}

function parsePayload<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}
