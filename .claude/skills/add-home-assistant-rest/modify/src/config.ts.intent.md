# Intent: src/config.ts modifications

## What changed
Added `HaActionMode` type alias, `HA_ACTION_MODE` constant, and `HA_TOOL_PORT` for the Home Assistant integration operating mode and tool server port.

## Key sections

- **Addition at end of file** — Three new exports appended after the existing `TIMEZONE` constant:
  - `HaActionMode` — union type `'read-only' | 'operate' | 'managed-apply'`
  - `HA_ACTION_MODE` — reads `process.env.HA_ACTION_MODE`, defaults to `'read-only'`
  - `HA_TOOL_PORT` — reads `process.env.HA_TOOL_PORT`, defaults to `3002`
  - All grouped under a `// Home Assistant integration` comment

## Invariants

All existing exports must be preserved exactly:
- `ASSISTANT_NAME`, `ASSISTANT_HAS_OWN_NUMBER`
- `POLL_INTERVAL`, `SCHEDULER_POLL_INTERVAL`
- `MOUNT_ALLOWLIST_PATH`, `SENDER_ALLOWLIST_PATH`
- `STORE_DIR`, `GROUPS_DIR`, `DATA_DIR`
- `CONTAINER_IMAGE`, `CONTAINER_TIMEOUT`, `CONTAINER_MAX_OUTPUT_SIZE`
- `CREDENTIAL_PROXY_PORT`
- `IPC_POLL_INTERVAL`, `IDLE_TIMEOUT`, `MAX_CONCURRENT_CONTAINERS`
- `TRIGGER_PATTERN`, `TIMEZONE`
- `readEnvFile` import and `envConfig` usage

## Added exports
- `HaActionMode` type and `HA_ACTION_MODE` constant
- `HA_TOOL_PORT` constant (port for the HA tool HTTP server, default 3002)

## Must-keep

- The `readEnvFile` call with `['ASSISTANT_NAME', 'ASSISTANT_HAS_OWN_NUMBER']` — do not extend this list with HA vars (secrets stay out of config.ts)
- The `escapeRegex` private helper — used by `TRIGGER_PATTERN`
- `SENDER_ALLOWLIST_PATH` — referenced by sender-allowlist.ts
- `CREDENTIAL_PROXY_PORT` — referenced by credential-proxy.ts
