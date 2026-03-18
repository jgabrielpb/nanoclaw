# Intent: src/index.ts modifications

## What changed
Added `startHaToolServer` import and conditional startup in `main()` so the HA tool HTTP server runs alongside the credential proxy when `HA_BASE_URL` is set.

## Key sections

- **Import addition** — `import { startHaToolServer } from './ha-tool-server.js';` added after the `startCredentialProxy` import
- **Server startup in main()** — After `startCredentialProxy(...)`, conditionally start HA server:
  ```typescript
  const haServer = process.env.HA_BASE_URL
    ? startHaToolServer(PROXY_BIND_HOST)
    : null;
  ```
- **Shutdown handler** — `haServer?.close();` added alongside `proxyServer.close();`

## Invariants

All existing imports, functions, and startup logic must be preserved exactly:
- `startCredentialProxy`, `PROXY_BIND_HOST`, `CREDENTIAL_PROXY_PORT` imports
- `ensureContainerSystemRunning`, `initDatabase`, `loadState`, `restoreRemoteControl` calls
- The full graceful shutdown handler (SIGTERM, SIGINT)
- Channel registration loop and all subsystem starts

## Must-keep

- The `if (channels.length === 0)` guard — must remain
- `queue.setProcessMessagesFn(processGroupMessages)` and `recoverPendingMessages()` calls
- The `isDirectRun` guard at the bottom of the file
