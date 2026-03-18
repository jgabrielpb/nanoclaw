/**
 * Home Assistant tool server for container agents.
 * Exposes handleHomeAssistantRequest over HTTP so containers can call HA
 * without needing direct credentials — credentials stay on the host.
 */
import http from 'node:http';

import { HA_TOOL_PORT } from './config.js';
import { logger } from './logger.js';
import { handleHomeAssistantRequest } from './tools/home-assistant.js';

export function startHaToolServer(bindHost: string): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/ha/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/ha') {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        Promise.resolve()
          .then(async () => {
            const request = JSON.parse(body) as Parameters<typeof handleHomeAssistantRequest>[0];
            const result = await handleHomeAssistantRequest(request);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          })
          .catch((err: unknown) => {
            logger.warn({ err }, 'HA tool server request error');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          });
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(HA_TOOL_PORT, bindHost, () => {
    logger.info({ port: HA_TOOL_PORT, host: bindHost }, 'HA tool server listening');
  });

  return server;
}
