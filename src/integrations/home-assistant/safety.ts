import { HaResolvedTarget, HaSafetyDecision } from './types.js';

const SENSITIVE_DOMAINS = new Map<string, HaSafetyDecision['sensitiveCategory']>([
  ['lock', 'lock'],
  ['alarm_control_panel', 'alarm'],
  ['cover', 'garage'],
  ['automation', 'automation'],
  ['scene', 'scene'],
]);

const MUTATING_VERBS = [
  'turn_on',
  'turn_off',
  'activate',
  'unlock',
  'open',
  'close',
  'disable',
  'enable',
];

export function assessSafety(
  intent: string,
  target: HaResolvedTarget | null,
  broadAction = false,
): HaSafetyDecision {
  if (broadAction) {
    return {
      requiresConfirmation: true,
      reason: 'Broad multi-entity action detected',
      sensitiveCategory: 'broad-action',
    };
  }

  const domain = target?.matches[0]?.domain;
  const category = domain ? SENSITIVE_DOMAINS.get(domain) : undefined;
  if (category && MUTATING_VERBS.some((verb) => intent.includes(verb))) {
    return {
      requiresConfirmation: true,
      reason: `Sensitive ${category} action requires confirmation`,
      sensitiveCategory: category,
    };
  }

  return { requiresConfirmation: false };
}
