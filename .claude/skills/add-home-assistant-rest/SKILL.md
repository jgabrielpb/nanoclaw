---
name: add-home-assistant-rest
description: Add native Home Assistant REST integration to NanoClaw. Use when the user wants NanoClaw to monitor Home Assistant, inspect config, cache entity and service metadata, control devices safely, activate scenes, troubleshoot behavior, or draft automations and scenes through natural language. Triggers on "home assistant", "add home assistant", "HA integration".
---

# Add Home Assistant REST Integration

Adds native Home Assistant support to NanoClaw using TypeScript modules and environment-based configuration. Gives the container agent structured access to entity state, services, history, config snapshots, and safe device control — with a safety gate for sensitive actions and a two-layer cache to keep reads fast.

## Phase 1: Pre-flight

### Check if already applied

Read `.nanoclaw/state.yaml`. If `add-home-assistant-rest` is in `applied_skills`, the code changes are already in place — skip to Phase 3 (Setup).

### Check for existing integration

Scan `src/integrations/` and `src/tools/` for any existing Home Assistant code. If found, report what exists and ask the user whether to proceed or skip.

### Ask the user

1. **Which operating mode?**
   - `read-only` — safe reads and reasoning only, no mutating service calls (default)
   - `operate` — allow real service calls; confirmation required for sensitive actions
   - `managed-apply` — proposal-first for persistent automations and scenes (only use if your repo has a safe managed workflow)
2. **Do you have a Home Assistant Long-Lived Access Token?** (Settings → Profile → Long-Lived Access Tokens)

Explain that `managed-apply` for persistent automations and scenes should remain proposal-first unless the repository already includes a safe file-editing workflow with backups and rollback.

## Phase 2: Apply Code Changes

### Initialize skills system (if needed)

If `.nanoclaw/` directory doesn't exist yet:

```bash
npx tsx scripts/apply-skill.ts --init
```

### Apply the skill

```bash
npx tsx scripts/apply-skill.ts .claude/skills/add-home-assistant-rest
```

This deterministically:
- Copies 8 new TypeScript modules into `src/integrations/home-assistant/` and `src/tools/`
- Merges `HA_ACTION_MODE` constant into `src/config.ts`

If the apply reports merge conflicts, read the intent file:
- `modify/src/config.ts.intent.md`

### Validate code changes

```bash
npm test
npm run build
```

All tests must pass and build must be clean before proceeding.

## Phase 3: Setup

### Add environment variables to `.env`

```bash
# Required
HA_BASE_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token_here

# Optional
HA_VERIFY_TLS=true          # Set false for self-signed certs
HA_TIMEOUT=15000             # HTTP timeout in ms (default: 15000)
HA_ACTION_MODE=read-only     # read-only | operate | managed-apply
```

Never commit `.env` to git. The token is sensitive — it is loaded only at runtime and never logged or exposed in errors.

### Build and restart

```bash
npm run build

# macOS
launchctl kickstart -k gui/$(id -u)/com.nanoclaw

# Linux
systemctl --user restart nanoclaw
```

## Phase 4: Registration

No channel registration is needed — this is a tool integration, not a channel. The container agent gains access to Home Assistant operations through the updated `groups/CLAUDE.md` guidance.

Append the following to `groups/CLAUDE.md` (create the file if it doesn't exist):

```markdown
## Home Assistant

You have access to Home Assistant via `handleHomeAssistantRequest` from `src/tools/home-assistant.ts`.

- Use it to read entity states, config snapshots, service catalogs, history, and logbook entries.
- Before any mutating service call, confirm the action with the user.
- For locks, alarms, garage doors, or whole-home scenes: always require explicit confirmation.
- For persistent automations and scenes: prefer proposal mode (draft YAML) unless managed-apply is configured.
- Never expose HA_TOKEN in responses, logs, or error messages.
- Cache is advisory for reads. Always revalidate targets and services before any mutating action.
```

## Phase 5: Verify

### Test read connectivity

Use the tool directly in a Node.js script or via the container agent:

```typescript
import { handleHomeAssistantRequest } from './src/tools/home-assistant.js';

// Verify API root
const root = await handleHomeAssistantRequest({ input: 'ping home assistant' });
console.log(root);

// Verify config
const config = await handleHomeAssistantRequest({ input: 'read config' });
console.log(config);

// Verify service catalog
const services = await handleHomeAssistantRequest({ input: 'list services' });
console.log(services);
```

All three should return `result: 'success'`. If any fail, check:
- `HA_BASE_URL` is reachable from the host
- `HA_TOKEN` is valid (test with `curl -H "Authorization: Bearer $HA_TOKEN" $HA_BASE_URL/api/`)
- TLS settings match your HA setup

### Check logs if needed

```bash
tail -f logs/nanoclaw.log
```

## Troubleshooting

### `Missing HA_BASE_URL` or `Missing HA_TOKEN`

The env vars are not loaded. Verify they are in `.env` and that `readEnvFile` is being called with them, or export them directly in the shell.

### `Home Assistant request failed: 401`

The token is invalid or expired. Generate a new Long-Lived Access Token in Home Assistant under Settings → Profile → Long-Lived Access Tokens.

### `Home Assistant request failed: 404`

Check that `HA_BASE_URL` does not have a trailing path component that interferes with URL building (e.g., `http://ha.local:8123/api` should be `http://ha.local:8123`).

### TLS errors

Set `HA_VERIFY_TLS=false` if your Home Assistant uses a self-signed certificate. Note: the Node.js built-in `fetch` respects `NODE_TLS_REJECT_UNAUTHORIZED` for process-wide TLS override if needed.

### Sensitive action blocked

The tool returns `result: 'needs-confirmation'` for locks, alarms, garage doors, or broad actions. Pass `requireConfirmation: true` only after the user has explicitly confirmed the action.

### Cache returning stale data

Call `cache.invalidate(key)` on the `HaCacheStore` instance to clear a specific key, or delete files under `.nanoclaw/cache/home-assistant/` to reset the persistent cache.

### `propose-automation` / `propose-scene` returns `result: 'proposal'`

These intents are in proposal mode by design. Draft the YAML for the automation or scene and present it to the user for review before applying manually through the Home Assistant UI or config files.
