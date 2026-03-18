import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { HaCacheEntry } from './types.js';

const CACHE_DIR = '.nanoclaw/cache/home-assistant';

export class HaCacheStore {
  private readonly memory = new Map<string, HaCacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const memoryValue = this.memory.get(key) as HaCacheEntry<T> | undefined;
    if (memoryValue && !this.isExpired(memoryValue)) {
      return memoryValue.value;
    }

    const diskValue = await this.readFromDisk<T>(key);
    if (diskValue && !this.isExpired(diskValue)) {
      this.memory.set(key, diskValue);
      return diskValue.value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const entry: HaCacheEntry<T> = {
      key,
      value,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };

    this.memory.set(key, entry);
    await this.writeToDisk(key, entry);
  }

  async invalidate(key: string): Promise<void> {
    this.memory.delete(key);
  }

  private isExpired(entry: HaCacheEntry<unknown>): boolean {
    return new Date(entry.expiresAt).getTime() <= Date.now();
  }

  private filePathFor(key: string): string {
    const safeKey = key.replace(/[^a-z0-9._-]/gi, '_');
    return join(CACHE_DIR, `${safeKey}.json`);
  }

  private async readFromDisk<T>(key: string): Promise<HaCacheEntry<T> | null> {
    try {
      const content = await readFile(this.filePathFor(key), 'utf8');
      return JSON.parse(content) as HaCacheEntry<T>;
    } catch {
      return null;
    }
  }

  private async writeToDisk<T>(key: string, entry: HaCacheEntry<T>): Promise<void> {
    const filePath = this.filePathFor(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
  }
}

export const HaCacheTtl = {
  configMs: 60 * 60 * 1000,
  servicesMs: 30 * 60 * 1000,
  entityIndexMs: 10 * 60 * 1000,
} as const;
