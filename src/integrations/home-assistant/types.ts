export type HaActionMode = 'read-only' | 'operate' | 'managed-apply';

export interface HaEnvConfig {
  baseUrl: string;
  token: string;
  verifyTls: boolean;
  timeoutMs: number;
}

export interface HaCacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  expiresAt: string;
}

export interface HaConfigSnapshot {
  locationName?: string;
  unitSystem?: string;
  timeZone?: string;
  version?: string;
  components?: string[];
  configDir?: string;
  raw?: Record<string, unknown>;
}

export interface HaServiceDefinition {
  domain: string;
  service: string;
  description?: string;
  fields?: Record<string, unknown>;
}

export interface HaServiceCatalog {
  fetchedAt: string;
  domains: Record<string, HaServiceDefinition[]>;
}

export interface HaEntitySummary {
  entityId: string;
  domain: string;
  friendlyName?: string;
  areaId?: string;
  deviceClass?: string;
  aliases: string[];
}

export interface HaResolvedTarget {
  query: string;
  expectedDomain?: string;
  matches: HaEntitySummary[];
  confidence: number;
  ambiguous: boolean;
}

export interface HaSafetyDecision {
  requiresConfirmation: boolean;
  reason?: string;
  sensitiveCategory?: 'lock' | 'alarm' | 'garage' | 'scene' | 'automation' | 'broad-action';
}

export interface HaOperationResult<T = unknown> {
  intent: string;
  target?: string;
  actionTaken: string;
  result: 'success' | 'error' | 'proposal' | 'needs-confirmation';
  data?: T;
  warnings?: string[];
}
