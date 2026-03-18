# Intent: src/container-runner.ts modifications

## What changed
Added `HA_TOOL_PORT` to config imports and inject `HA_TOOL_URL` env var into containers when `HA_BASE_URL` is configured, so container agents can reach the host-side HA tool server.

## Key sections

- **Import addition** — `HA_TOOL_PORT` added to the config import block (alphabetically between `GROUPS_DIR` and `IDLE_TIMEOUT`)
- **Container env injection in `buildContainerArgs()`** — After the `ANTHROPIC_BASE_URL` env push:
  ```typescript
  if (process.env.HA_BASE_URL) {
    args.push('-e', `HA_TOOL_URL=http://${CONTAINER_HOST_GATEWAY}:${HA_TOOL_PORT}`);
  }
  ```

## Invariants

All existing logic in `buildContainerArgs`, `buildVolumeMounts`, `runContainerAgent`, `writeTasksSnapshot`, and `writeGroupsSnapshot` must be preserved exactly.

## Must-keep

- `.env` shadow mount (`/dev/null` → `/workspace/project/.env`) — prevents containers from reading secrets
- `ANTHROPIC_BASE_URL` and auth mode env var injection — credential proxy routing must remain intact
- `hostGatewayArgs()` call — required for host.docker.internal resolution on Linux
- `--user` flag logic for host UID matching
