import { HaEntitySummary, HaResolvedTarget } from './types.js';

interface RawHaState {
  entity_id: string;
  attributes?: {
    friendly_name?: string;
    device_class?: string;
    area_id?: string;
  };
}

export function summarizeEntities(
  states: RawHaState[],
  areaMap: Record<string, string> = {},
): HaEntitySummary[] {
  return states.map((state) => {
    const [domain] = state.entity_id.split('.');
    const friendlyName = state.attributes?.friendly_name;
    const areaName = areaMap[state.entity_id];
    return {
      entityId: state.entity_id,
      domain,
      friendlyName,
      areaId: areaName ?? state.attributes?.area_id,
      deviceClass: state.attributes?.device_class,
      aliases: buildAliases(state.entity_id, friendlyName, areaName),
    };
  });
}

export async function fetchAreaMap(
  get: (path: string) => Promise<unknown>,
  postText: (path: string, body: unknown) => Promise<string>,
): Promise<Record<string, string>> {
  try {
    const template = '{% for s in states %}{{ s.entity_id }}|{{ area_name(s.entity_id) }}\n{% endfor %}';
    const result = await postText('/api/template', { template });
    const map: Record<string, string> = {};
    for (const line of result.split('\n')) {
      const [entityId, areaName] = line.split('|');
      if (entityId && areaName && areaName.trim()) {
        map[entityId.trim()] = areaName.trim();
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function resolveEntity(
  query: string,
  entities: HaEntitySummary[],
  expectedDomain?: string,
): HaResolvedTarget {
  const normalized = normalize(query);
  const scored = entities
    .filter((entity) => !expectedDomain || entity.domain === expectedDomain)
    .map((entity) => ({ entity, score: scoreEntity(normalized, entity) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = scored[0]?.score ?? 0;
  const matches = scored.filter((item) => item.score === bestScore).map((item) => item.entity);

  return {
    query,
    expectedDomain,
    matches,
    confidence: Math.min(bestScore / 100, 1),
    ambiguous: matches.length > 1,
  };
}

function buildAliases(entityId: string, friendlyName?: string, areaName?: string): string[] {
  const aliases = new Set<string>();
  aliases.add(normalize(entityId));
  entityId.split(/[._]/).forEach((part) => aliases.add(normalize(part)));
  if (friendlyName) {
    aliases.add(normalize(friendlyName));
    friendlyName.split(/\s+/).forEach((part) => aliases.add(normalize(part)));
    // Qualified name: "area friendlyName" — e.g. "escritório central"
    if (areaName) {
      aliases.add(normalize(`${areaName} ${friendlyName}`));
    }
  }
  if (areaName) {
    aliases.add(normalize(areaName));
    areaName.split(/\s+/).forEach((part) => aliases.add(normalize(part)));
  }
  return Array.from(aliases).filter(Boolean);
}

function scoreEntity(query: string, entity: HaEntitySummary): number {
  const haystacks = [entity.entityId, entity.friendlyName, ...entity.aliases]
    .filter(Boolean)
    .map((v) => normalize(String(v)));
  if (haystacks.some((v) => v === query)) return 100;
  if (haystacks.some((v) => v.includes(query))) return 80;
  if (query.split(' ').every((part) => haystacks.some((v) => v.includes(part)))) return 60;
  return 0;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s._-]/g, '')
    .trim();
}
