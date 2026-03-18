import { HaResolvedTarget, HaSafetyDecision } from './types.js';

const SENSITIVE_DOMAINS = new Map<string, HaSafetyDecision['sensitiveCategory']>([
  ['lock', 'lock'],
  ['alarm_control_panel', 'alarm'],
  ['cover', 'garage'],
  ['automation', 'automation'],
  ['scene', 'scene'],
]);

export function assessSafety(intent: string, target: HaResolvedTarget | null, broadAction = false): HaSafetyDecision {
  if (broadAction) {
    return {
      requiresConfirmation: true,
      reason: 'Broad multi-entity action detected',
      sensitiveCategory: 'broad-action',
    };
  }

  const domain = target?.matches[0]?.domain;
  const category = domain ? SENSITIVE_DOMAINS.get(domain) : undefined;
  if (category && ['turn_on', 'turn_off', 'activate', 'unlock', 'open', 'close', 'disable', 'enable'].some((word) => intent.includes(word))) {
    return {
      requiresConfirmation: true,
      reason: `Sensitive ${category} action requires confirmation`,
      sensitiveCategory: category,
    };
  }

  return { requiresConfirmation: false };
}
