# Cache Policy

## Goals
- Reduce repeated wide reads against the Home Assistant REST API.
- Improve entity resolution and service lookup.
- Keep mutating actions safe through live revalidation.

## Cache layers
### Session cache
In-memory cache for the current process lifetime.
Recommended for:
- latest config snapshot
- latest service catalog
- recent entity resolution choices

### Persistent cache
JSON snapshots stored under:
`.nanoclaw/cache/home-assistant/`

Recommended files:
- `config.json`
- `services.json`
- `entity-index.json`
- `meta.json`

## TTL recommendations
- config snapshot: 1 hour
- service catalog: 30 minutes
- entity index: 10 minutes
- recent resolution memory: process lifetime

## What to persist
Persist compact summaries only:
- config metadata relevant to reasoning
- available services by domain
- summarized entity inventory (`entity_id`, `friendly_name`, domain, device class, area when available)

## What not to persist
- raw authorization data
- full state payload dumps long-term
- full history results
- full logbook results
- full error logs

## Mutating actions
Cache is never authoritative for mutating actions.
Always revalidate target and service availability before calling a service.
