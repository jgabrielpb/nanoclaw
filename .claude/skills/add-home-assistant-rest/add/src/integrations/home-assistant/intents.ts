export type HaIntent =
  | 'read-root'
  | 'read-config'
  | 'list-components'
  | 'list-events'
  | 'list-services'
  | 'list-calendars'
  | 'get-calendar-events'
  | 'read-states'
  | 'read-state'
  | 'update-state'
  | 'delete-state'
  | 'call-service'
  | 'fire-event'
  | 'read-history'
  | 'read-logbook'
  | 'read-error-log'
  | 'render-template'
  | 'check-config'
  | 'handle-intent'
  | 'propose-automation'
  | 'propose-scene'
  | 'unknown';

export function inferIntent(input: string): HaIntent {
  const text = input.toLowerCase();

  if (text.includes('check config') || text.includes('validate config')) return 'check-config';
  if (text.includes('error log') || text.includes('error_log') || (text.includes('error') && text.includes('log'))) return 'read-error-log';
  if (text.match(/\btemplate\b/) && (text.includes('render') || text.includes('{%') || text.includes('{{'))) return 'render-template';
  if (text.includes('history')) return 'read-history';
  if (text.includes('logbook')) return 'read-logbook';
  if (text.includes('components') || text.includes('integrations installed')) return 'list-components';
  if (text.includes('calendar event') || text.includes('eventos do calendário')) return 'get-calendar-events';
  if (text.includes('calendar') || text.includes('calendário')) return 'list-calendars';
  if (text.includes('available event') || text.includes('list event') || text.includes('tipos de evento')) return 'list-events';
  if (text.includes('fire event') || text.includes('trigger event') || text.includes('disparar evento')) return 'fire-event';
  if (text.includes('handle intent') || text.includes('process intent') || text.includes('intent/handle')) return 'handle-intent';
  if (text.includes('delete state') || text.includes('remove entity') || text.includes('deletar estado')) return 'delete-state';
  if ((text.includes('update state') || text.includes('set state') || text.includes('atualizar estado')) && text.includes('to ')) return 'update-state';
  if (text.includes('services') && !text.match(/\b(call|invocar|executar)\b/)) return 'list-services';
  if (text.includes('automation'))
    return text.includes('create') || text.includes('draft') || text.includes('criar') ? 'propose-automation' : 'call-service';
  if (text.includes('scene') || text.includes('cena'))
    return text.includes('create') || text.includes('draft') || text.includes('criar') ? 'propose-scene' : 'call-service';
  if (
    text.match(/\b(turn[_ ]?on|turn[_ ]?off|toggle|liga|desliga|apaga|acende|abre|fecha|tranca|destranca|ativa|desativa|ligar|desligar|open|close|lock|unlock|activate)\b/)
  )
    return 'call-service';
  if (text.includes('state of') || text.startsWith('what is') || text.match(/\bestado d[aeo]\b/)) return 'read-state';
  if (text.includes('states') || text.includes('entities') || text.includes('entidades')) return 'read-states';
  if (text.includes('config')) return 'read-config';
  if (text.includes('api root') || text === 'ping home assistant') return 'read-root';
  return 'unknown';
}
