import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(__dirname, '..');

describe('add-home-assistant-rest skill package', () => {
  it('has a valid SKILL.md with correct frontmatter', () => {
    const skillPath = path.join(skillDir, 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/^---\n/);
    expect(content).toContain('name: add-home-assistant-rest');
    expect(content).toContain('description:');
  });

  it('has a valid manifest.yaml with required fields', () => {
    const manifestPath = path.join(skillDir, 'manifest.yaml');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content).toContain('skill: add-home-assistant-rest');
    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('core_version: 0.1.0');
    expect(content).toContain('adds:');
    expect(content).toContain('modifies:');
  });

  it('manifest lists all 9 added files and no npm dependencies', () => {
    const content = fs.readFileSync(path.join(skillDir, 'manifest.yaml'), 'utf-8');
    expect(content).toContain('src/integrations/home-assistant/types.ts');
    expect(content).toContain('src/integrations/home-assistant/client.ts');
    expect(content).toContain('src/integrations/home-assistant/cache.ts');
    expect(content).toContain('src/integrations/home-assistant/entity-index.ts');
    expect(content).toContain('src/integrations/home-assistant/intents.ts');
    expect(content).toContain('src/integrations/home-assistant/safety.ts');
    expect(content).toContain('src/integrations/home-assistant/service-map.ts');
    expect(content).toContain('src/tools/home-assistant.ts');
    expect(content).toContain('src/ha-tool-server.ts');
    expect(content).not.toContain('npm_dependencies');
  });

  it('manifest lists all 3 modified files', () => {
    const content = fs.readFileSync(path.join(skillDir, 'manifest.yaml'), 'utf-8');
    expect(content).toContain('src/config.ts');
    expect(content).toContain('src/index.ts');
    expect(content).toContain('src/container-runner.ts');
  });

  it('manifest lists all 6 env vars', () => {
    const content = fs.readFileSync(path.join(skillDir, 'manifest.yaml'), 'utf-8');
    expect(content).toContain('HA_BASE_URL');
    expect(content).toContain('HA_TOKEN');
    expect(content).toContain('HA_VERIFY_TLS');
    expect(content).toContain('HA_TIMEOUT');
    expect(content).toContain('HA_ACTION_MODE');
    expect(content).toContain('HA_TOOL_PORT');
  });

  describe('add/ files', () => {
    const addDir = path.join(skillDir, 'add');

    it('all files declared in adds exist under add/', () => {
      const files = [
        'src/integrations/home-assistant/types.ts',
        'src/integrations/home-assistant/client.ts',
        'src/integrations/home-assistant/cache.ts',
        'src/integrations/home-assistant/entity-index.ts',
        'src/integrations/home-assistant/intents.ts',
        'src/integrations/home-assistant/safety.ts',
        'src/integrations/home-assistant/service-map.ts',
        'src/tools/home-assistant.ts',
        'src/ha-tool-server.ts',
      ];
      for (const file of files) {
        expect(fs.existsSync(path.join(addDir, file)), `Missing: add/${file}`).toBe(true);
      }
    });

    it('types.ts exports all required interfaces', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/types.ts'),
        'utf-8',
      );
      expect(content).toContain('HaActionMode');
      expect(content).toContain('HaEnvConfig');
      expect(content).toContain('HaCacheEntry');
      expect(content).toContain('HaEntitySummary');
      expect(content).toContain('HaResolvedTarget');
      expect(content).toContain('HaSafetyDecision');
      expect(content).toContain('HaOperationResult');
      expect(content).toContain('HaServiceCatalog');
    });

    it('client.ts exports HomeAssistantClient and loadHaEnv', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/client.ts'),
        'utf-8',
      );
      expect(content).toContain('export class HomeAssistantClient');
      expect(content).toContain('export function loadHaEnv');
      expect(content).toContain('Bearer [REDACTED]');
      expect(content).toContain('Missing HA_BASE_URL');
      expect(content).toContain('Missing HA_TOKEN');
    });

    it('client.ts does not interpolate env.token into error strings', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/client.ts'),
        'utf-8',
      );
      expect(content).toContain('redactSecrets');
      expect(content).not.toMatch(/throw\s+new\s+Error\s*\([^)]*\$\{[^}]*\.token[^}]*\}/);
      expect(content).toContain('redactSecrets(text)');
      expect(content).toContain('redactSecrets(error.message)');
    });

    it('cache.ts exports HaCacheStore and HaCacheTtl', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/cache.ts'),
        'utf-8',
      );
      expect(content).toContain('export class HaCacheStore');
      expect(content).toContain('export const HaCacheTtl');
      expect(content).toContain('configMs');
      expect(content).toContain('servicesMs');
      expect(content).toContain('entityIndexMs');
    });

    it('entity-index.ts exports summarizeEntities and resolveEntity', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/entity-index.ts'),
        'utf-8',
      );
      expect(content).toContain('export function summarizeEntities');
      expect(content).toContain('export function resolveEntity');
    });

    it('intents.ts exports HaIntent union and inferIntent', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/intents.ts'),
        'utf-8',
      );
      expect(content).toContain('export type HaIntent');
      expect(content).toContain('export function inferIntent');
      expect(content).toContain("'propose-automation'");
      expect(content).toContain("'propose-scene'");
    });

    it('safety.ts exports assessSafety and covers sensitive domains', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/safety.ts'),
        'utf-8',
      );
      expect(content).toContain('export function assessSafety');
      expect(content).toContain("'lock'");
      expect(content).toContain("'alarm_control_panel'");
      expect(content).toContain("'cover'");
      expect(content).toContain('requiresConfirmation: true');
    });

    it('service-map.ts exports buildServiceCatalog and serviceExists', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/integrations/home-assistant/service-map.ts'),
        'utf-8',
      );
      expect(content).toContain('export function buildServiceCatalog');
      expect(content).toContain('export function serviceExists');
    });

    it('home-assistant.ts exports handleHomeAssistantRequest and HomeAssistantToolRequest', () => {
      const content = fs.readFileSync(
        path.join(addDir, 'src/tools/home-assistant.ts'),
        'utf-8',
      );
      expect(content).toContain('export interface HomeAssistantToolRequest');
      expect(content).toContain('export async function handleHomeAssistantRequest');
      expect(content).toContain("result: 'needs-confirmation'");
      expect(content).toContain("result: 'proposal'");
    });

    it('ha-tool-server.ts exports startHaToolServer and uses HA_TOOL_PORT', () => {
      const content = fs.readFileSync(path.join(addDir, 'src/ha-tool-server.ts'), 'utf-8');
      expect(content).toContain('export function startHaToolServer');
      expect(content).toContain('HA_TOOL_PORT');
      expect(content).toContain('/ha/ping');
      expect(content).toContain('handleHomeAssistantRequest');
    });
  });

  describe('modify/ files', () => {
    const modifyDir = path.join(skillDir, 'modify');

    it('all files declared in modifies exist under modify/', () => {
      expect(fs.existsSync(path.join(modifyDir, 'src/config.ts'))).toBe(true);
      expect(fs.existsSync(path.join(modifyDir, 'src/index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(modifyDir, 'src/container-runner.ts'))).toBe(true);
    });

    it('intent files exist for every modified file', () => {
      expect(fs.existsSync(path.join(modifyDir, 'src/config.ts.intent.md'))).toBe(true);
      expect(fs.existsSync(path.join(modifyDir, 'src/index.ts.intent.md'))).toBe(true);
      expect(fs.existsSync(path.join(modifyDir, 'src/container-runner.ts.intent.md'))).toBe(true);
    });

    it('modified config.ts preserves all original main-branch exports', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/config.ts'), 'utf-8');
      // Core config
      expect(content).toContain('export const ASSISTANT_NAME');
      expect(content).toContain('export const ASSISTANT_HAS_OWN_NUMBER');
      expect(content).toContain('export const POLL_INTERVAL');
      expect(content).toContain('export const SCHEDULER_POLL_INTERVAL');
      // Security paths
      expect(content).toContain('export const MOUNT_ALLOWLIST_PATH');
      expect(content).toContain('export const SENDER_ALLOWLIST_PATH');
      // Data paths
      expect(content).toContain('export const STORE_DIR');
      expect(content).toContain('export const GROUPS_DIR');
      expect(content).toContain('export const DATA_DIR');
      // Container / runtime
      expect(content).toContain('export const CONTAINER_IMAGE');
      expect(content).toContain('export const CONTAINER_TIMEOUT');
      expect(content).toContain('export const CONTAINER_MAX_OUTPUT_SIZE');
      expect(content).toContain('export const CREDENTIAL_PROXY_PORT');
      expect(content).toContain('export const IPC_POLL_INTERVAL');
      expect(content).toContain('export const IDLE_TIMEOUT');
      expect(content).toContain('export const MAX_CONCURRENT_CONTAINERS');
      // Trigger / timezone
      expect(content).toContain('export const TRIGGER_PATTERN');
      expect(content).toContain('export const TIMEZONE');
    });

    it('modified config.ts adds HA_ACTION_MODE and HaActionMode', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/config.ts'), 'utf-8');
      expect(content).toContain(
        "export type HaActionMode = 'read-only' | 'operate' | 'managed-apply'",
      );
      expect(content).toContain('export const HA_ACTION_MODE: HaActionMode');
      expect(content).toContain("'read-only'");
    });

    it('modified config.ts does not add HA_TOKEN or HA_BASE_URL to readEnvFile', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/config.ts'), 'utf-8');
      const readEnvCall = content.match(/readEnvFile\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
      expect(readEnvCall).not.toContain('HA_TOKEN');
      expect(readEnvCall).not.toContain('HA_BASE_URL');
    });

    it('modified config.ts adds HA_TOOL_PORT', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/config.ts'), 'utf-8');
      expect(content).toContain('export const HA_TOOL_PORT');
      expect(content).toContain("'3002'");
    });

    it('modified index.ts imports and starts startHaToolServer', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/index.ts'), 'utf-8');
      expect(content).toContain('startHaToolServer');
      expect(content).toContain('ha-tool-server');
      expect(content).toContain('HA_CONFIGURED');
      expect(content).toContain('PROXY_BIND_HOST');
    });

    it('modified index.ts closes haServer on shutdown', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/index.ts'), 'utf-8');
      expect(content).toContain('haServer');
      expect(content).toMatch(/haServer.*close/);
    });

    it('modified container-runner.ts imports HA_CONFIGURED and injects HA_TOOL_URL', () => {
      const content = fs.readFileSync(path.join(modifyDir, 'src/container-runner.ts'), 'utf-8');
      expect(content).toContain('HA_CONFIGURED');
      expect(content).toContain('HA_TOOL_PORT');
      expect(content).toContain('HA_TOOL_URL');
      expect(content).toContain('CONTAINER_HOST_GATEWAY');
    });
  });

  describe('references/', () => {
    it('all four reference files exist', () => {
      const refs = ['SAFETY.md', 'CACHE_POLICY.md', 'APPLY_MODE.md', 'ENDPOINTS.md'];
      for (const ref of refs) {
        expect(
          fs.existsSync(path.join(skillDir, 'references', ref)),
          `Missing: references/${ref}`,
        ).toBe(true);
      }
    });
  });
});
