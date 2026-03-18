import { HaCacheStore, HaCacheTtl } from '../integrations/home-assistant/cache.js';
import { HomeAssistantClient } from '../integrations/home-assistant/client.js';
import { summarizeEntities, resolveEntity, fetchAreaMap } from '../integrations/home-assistant/entity-index.js';
import { inferIntent } from '../integrations/home-assistant/intents.js';
import { assessSafety } from '../integrations/home-assistant/safety.js';
import { buildServiceCatalog } from '../integrations/home-assistant/service-map.js';
import { HaEntitySummary, HaOperationResult } from '../integrations/home-assistant/types.js';

const ACTION_WORDS =
  /\b(turn[_ ]?on|turn[_ ]?off|toggle|open|close|stop|lock|unlock|activate|deactivate|liga|desliga|apaga|acende|abre|fecha|tranca|destranca|ativa|desativa|ligar|desligar)\b/gi;

function extractEntityQuery(input: string): string {
  return input.replace(ACTION_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

function inferService(input: string, entity: HaEntitySummary): string | null {
  const text = input.toLowerCase();
  const { domain } = entity;

  if (domain === 'cover') {
    if (text.match(/\b(open|abre|abrir)\b/)) return 'open_cover';
    if (text.match(/\b(close|fecha|fechar)\b/)) return 'close_cover';
    if (text.match(/\b(stop|para|parar)\b/)) return 'stop_cover';
    return null;
  }
  if (domain === 'lock') {
    if (text.match(/\b(unlock|destranca|destrancar)\b/)) return 'unlock';
    if (text.match(/\b(lock|tranca|trancar)\b/)) return 'lock';
    return null;
  }
  if (domain === 'scene') return 'turn_on';
  if (domain === 'script') return 'turn_on';

  if (text.match(/\b(turn[_ ]?off|deslig|apag|off)\b/)) return 'turn_off';
  if (text.match(/\b(turn[_ ]?on|lig|on)\b/)) return 'turn_on';
  if (text.match(/\b(toggle|altern)\b/)) return 'toggle';
  return null;
}

function last24hIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export interface HomeAssistantToolRequest {
  input: string;
  expectedDomain?: string;
  requireConfirmation?: boolean;
  params?: {
    template?: string;
    entityId?: string;
    eventType?: string;
    eventData?: unknown;
    newState?: string;
    stateAttributes?: Record<string, unknown>;
    startTime?: string;
    endTime?: string;
    intentName?: string;
    intentData?: unknown;
  };
}

export async function handleHomeAssistantRequest(
  request: HomeAssistantToolRequest,
): Promise<HaOperationResult> {
  const client = new HomeAssistantClient();
  const cache = new HaCacheStore();
  const intent = inferIntent(request.input);

  switch (intent) {
    case 'read-root': {
      const data = await client.get<Record<string, unknown>>('/api/');
      return { intent, actionTaken: 'Read Home Assistant API root', result: 'success', data };
    }

    case 'read-config': {
      const cached = await cache.get<Record<string, unknown>>('config');
      if (cached) return { intent, actionTaken: 'Read cached HA config', result: 'success', data: cached };
      const data = await client.get<Record<string, unknown>>('/api/config');
      await cache.set('config', data, HaCacheTtl.configMs);
      return { intent, actionTaken: 'Read live HA config', result: 'success', data };
    }

    case 'list-components': {
      const data = await client.get<string[]>('/api/components');
      return { intent, actionTaken: 'Listed installed HA components/integrations', result: 'success', data };
    }

    case 'list-events': {
      const data = await client.get<unknown[]>('/api/events');
      return { intent, actionTaken: 'Listed available HA event types', result: 'success', data };
    }

    case 'list-services': {
      const cached = await cache.get<unknown[]>('services');
      const raw = cached ?? (await client.get<unknown[]>('/api/services'));
      if (!cached) await cache.set('services', raw, HaCacheTtl.servicesMs);
      const data = buildServiceCatalog(raw as never[]);
      return {
        intent,
        actionTaken: cached ? 'Read cached service catalog' : 'Read live service catalog',
        result: 'success',
        data,
      };
    }

    case 'list-calendars': {
      const data = await client.get<unknown[]>('/api/calendars');
      return { intent, actionTaken: 'Listed HA calendars', result: 'success', data };
    }

    case 'get-calendar-events': {
      const calId = request.params?.entityId ?? extractEntityQuery(request.input);
      const start = request.params?.startTime ?? new Date().toISOString();
      const end = request.params?.endTime ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const data = await client.get<unknown[]>(`/api/calendars/${encodeURIComponent(calId)}`, { start, end });
      return { intent, target: calId, actionTaken: `Fetched calendar events for ${calId}`, result: 'success', data };
    }

    case 'read-states': {
      const [raw, areaMap] = await Promise.all([
        client.get<unknown[]>('/api/states'),
        fetchAreaMap((p) => client.get(p), (p, b) => client.postText(p, b)),
      ]);
      const entities = summarizeEntities(raw as never[], areaMap);
      await cache.set('entity-index', entities, HaCacheTtl.entityIndexMs);
      return { intent, actionTaken: 'Read live state inventory', result: 'success', data: entities };
    }

    case 'read-state': {
      const entityId = request.params?.entityId;
      if (entityId) {
        const data = await client.get<Record<string, unknown>>(`/api/states/${entityId}`);
        return { intent, target: entityId, actionTaken: `Read state of ${entityId}`, result: 'success', data };
      }
      const [raw, areaMap] = await Promise.all([
        client.get<unknown[]>('/api/states'),
        fetchAreaMap((p) => client.get(p), (p, b) => client.postText(p, b)),
      ]);
      const entities = summarizeEntities(raw as never[], areaMap);
      const resolved = resolveEntity(extractEntityQuery(request.input), entities, request.expectedDomain);
      if (resolved.matches.length === 1) {
        const data = await client.get<Record<string, unknown>>(`/api/states/${resolved.matches[0].entityId}`);
        return { intent, target: resolved.matches[0].entityId, actionTaken: `Read state of ${resolved.matches[0].entityId}`, result: 'success', data };
      }
      return {
        intent,
        target: resolved.matches[0]?.entityId,
        actionTaken: 'Resolved entity from state inventory',
        result: resolved.matches.length ? 'success' : 'error',
        data: resolved,
        warnings: resolved.ambiguous ? ['Multiple matching entities found'] : undefined,
      };
    }

    case 'update-state': {
      const entityId = request.params?.entityId;
      const newState = request.params?.newState;
      if (!entityId || !newState) {
        return {
          intent,
          actionTaken: 'Missing entityId or newState in params',
          result: 'error',
          warnings: ['Provide params.entityId and params.newState'],
        };
      }
      const body: Record<string, unknown> = { state: newState };
      if (request.params?.stateAttributes) body.attributes = request.params.stateAttributes;
      const data = await client.post<Record<string, unknown>>(`/api/states/${entityId}`, body);
      return { intent, target: entityId, actionTaken: `Updated state of ${entityId} to "${newState}"`, result: 'success', data };
    }

    case 'delete-state': {
      const entityId = request.params?.entityId ?? extractEntityQuery(request.input);
      if (!entityId) {
        return { intent, actionTaken: 'Missing entity ID', result: 'error', warnings: ['Provide params.entityId'] };
      }
      await client.delete(`/api/states/${entityId}`);
      return { intent, target: entityId, actionTaken: `Deleted state for ${entityId}`, result: 'success' };
    }

    case 'call-service': {
      const [rawStates, areaMap] = await Promise.all([
        client.get<unknown[]>('/api/states'),
        fetchAreaMap((p) => client.get(p), (p, b) => client.postText(p, b)),
      ]);
      const entities = summarizeEntities(rawStates as never[], areaMap);
      const entityQuery = extractEntityQuery(request.input);
      const resolved = resolveEntity(entityQuery, entities, request.expectedDomain);
      const safety = assessSafety(request.input.toLowerCase(), resolved, false);

      if (safety.requiresConfirmation && !request.requireConfirmation) {
        return {
          intent,
          target: resolved.matches[0]?.entityId,
          actionTaken: 'Blocked pending explicit confirmation',
          result: 'needs-confirmation',
          data: safety,
          warnings: [safety.reason ?? 'Sensitive action'],
        };
      }

      if (!resolved.matches.length) {
        return { intent, actionTaken: 'Entity not found', result: 'error', warnings: [`No entity matched: ${request.input}`] };
      }

      const entity = resolved.matches[0];
      const service = inferService(request.input, entity);
      if (!service) {
        return {
          intent,
          target: entity.entityId,
          actionTaken: 'Could not infer service from input',
          result: 'error',
          warnings: [`Unable to determine action for: ${request.input}`],
        };
      }

      const data = await client.post(`/api/services/${entity.domain}/${service}`, { entity_id: entity.entityId });
      return { intent, target: entity.entityId, actionTaken: `Called ${entity.domain}.${service} on ${entity.entityId}`, result: 'success', data };
    }

    case 'fire-event': {
      const eventType = request.params?.eventType ?? extractEntityQuery(request.input).replace(/^fire event\s+/i, '').trim();
      if (!eventType) {
        return { intent, actionTaken: 'Missing event type', result: 'error', warnings: ['Provide params.eventType or include it in input'] };
      }
      const data = await client.post<Record<string, unknown>>(`/api/events/${encodeURIComponent(eventType)}`, request.params?.eventData ?? {});
      return { intent, actionTaken: `Fired event "${eventType}"`, result: 'success', data };
    }

    case 'read-history': {
      const start = request.params?.startTime ?? last24hIso();
      const query: Record<string, string> = {
        minimal_response: 'true',
        significant_changes_only: 'true',
        no_attributes: 'true',
      };
      if (request.params?.endTime) query.end_time = request.params.endTime;
      if (request.params?.entityId) query.filter_entity_id = request.params.entityId;
      else {
        // Try to resolve entity from input
        const entityHint = extractEntityQuery(request.input).replace(/\bhistory\b/gi, '').trim();
        if (entityHint) {
          const raw = await client.get<unknown[]>('/api/states');
          const areaMap = await fetchAreaMap((p) => client.get(p), (p, b) => client.postText(p, b));
          const entities = summarizeEntities(raw as never[], areaMap);
          const resolved = resolveEntity(entityHint, entities, request.expectedDomain);
          if (resolved.matches.length === 1) query.filter_entity_id = resolved.matches[0].entityId;
        }
      }
      const data = await client.get<unknown[][]>(`/api/history/period/${encodeURIComponent(start)}`, query);
      return { intent, actionTaken: `Read state history from ${start}`, result: 'success', data };
    }

    case 'read-logbook': {
      const start = request.params?.startTime ?? last24hIso();
      const query: Record<string, string> = {};
      if (request.params?.endTime) query.end_time = request.params.endTime;
      if (request.params?.entityId) query.entity = request.params.entityId;
      const data = await client.get<unknown[]>(`/api/logbook/${encodeURIComponent(start)}`, query);
      return { intent, actionTaken: `Read logbook from ${start}`, result: 'success', data };
    }

    case 'read-error-log': {
      const data = await client.getText('/api/error_log');
      return { intent, actionTaken: 'Read HA error log', result: 'success', data };
    }

    case 'render-template': {
      const template =
        request.params?.template ??
        request.input.replace(/^render\s+template\s*:?\s*/i, '').trim();
      if (!template) {
        return { intent, actionTaken: 'Missing template', result: 'error', warnings: ['Provide params.template or include the Jinja2 template in input'] };
      }
      const data = await client.postText('/api/template', { template });
      return { intent, actionTaken: 'Rendered Jinja2 template', result: 'success', data };
    }

    case 'check-config': {
      const data = await client.post<Record<string, unknown>>('/api/config/core/check_config');
      return { intent, actionTaken: 'Checked HA configuration', result: 'success', data };
    }

    case 'handle-intent': {
      const intentName = request.params?.intentName ?? extractEntityQuery(request.input).replace(/^handle intent\s+/i, '').trim();
      if (!intentName) {
        return { intent, actionTaken: 'Missing intent name', result: 'error', warnings: ['Provide params.intentName'] };
      }
      const body = { name: intentName, data: request.params?.intentData ?? {} };
      const data = await client.post<Record<string, unknown>>('/api/intent/handle', body);
      return { intent, actionTaken: `Handled intent "${intentName}"`, result: 'success', data };
    }

    case 'propose-automation':
      return { intent, actionTaken: 'Automation proposal — describe the trigger, condition, and action you want', result: 'proposal' };

    case 'propose-scene':
      return { intent, actionTaken: 'Scene proposal — describe the desired device states', result: 'proposal' };

    default:
      return {
        intent,
        actionTaken: 'No Home Assistant intent matched',
        result: 'error',
        warnings: ['Unable to infer the requested Home Assistant operation'],
      };
  }
}
