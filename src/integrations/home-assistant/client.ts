import { readEnvFile } from '../../env.js';
import { HaEnvConfig } from './types.js';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function redactSecrets(message: string): string {
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

export function loadHaEnv(): HaEnvConfig {
  // HA vars are secrets kept in .env, not auto-loaded into process.env
  const dotenv = readEnvFile(['HA_BASE_URL', 'HA_TOKEN', 'HA_VERIFY_TLS', 'HA_TIMEOUT']);
  const baseUrl = (process.env.HA_BASE_URL || dotenv.HA_BASE_URL)?.trim();
  const token = (process.env.HA_TOKEN || dotenv.HA_TOKEN)?.trim();
  const verifyTls = parseBoolean(process.env.HA_VERIFY_TLS ?? dotenv.HA_VERIFY_TLS, true);
  const timeoutMs = Number.parseInt(process.env.HA_TIMEOUT ?? dotenv.HA_TIMEOUT ?? '15000', 10);

  if (!baseUrl) throw new Error('Missing HA_BASE_URL');
  if (!token) throw new Error('Missing HA_TOKEN');

  return {
    baseUrl,
    token,
    verifyTls,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
  };
}

export class HomeAssistantClient {
  constructor(private readonly env: HaEnvConfig = loadHaEnv()) {}

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.requestJson<T>('GET', path, undefined, query);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.requestJson<T>('POST', path, body);
  }

  async getText(path: string, query?: Record<string, string>): Promise<string> {
    return this.requestText('GET', path, undefined, query);
  }

  async postText(path: string, body?: unknown): Promise<string> {
    return this.requestText('POST', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.requestJson<T>('DELETE', path);
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(
      path.replace(/^\/+/, ''),
      this.env.baseUrl.endsWith('/') ? this.env.baseUrl : `${this.env.baseUrl}/`,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async requestJson<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<T> {
    const responseText = await this.requestText(method, path, body, query);
    if (!responseText.trim()) return undefined as T;
    return JSON.parse(responseText) as T;
  }

  private async requestText(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.env.timeoutMs);
    try {
      const response = await fetch(this.buildUrl(path, query), {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.env.token}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(
          `Home Assistant request failed: ${response.status} ${response.statusText} - ${redactSecrets(text)}`,
        );
      }
      return text;
    } catch (error) {
      const message =
        error instanceof Error
          ? redactSecrets(error.message)
          : 'Unknown Home Assistant client error';
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }
}
