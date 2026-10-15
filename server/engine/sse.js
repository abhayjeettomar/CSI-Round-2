// server/engine/sse.js
// High-performance Server-Sent Events (SSE) broadcaster with auto-cleanup & ping

const clients = new Set();

/**
 * Register an incoming Express request/response as an SSE client
 */
export function registerClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now(), clients: clients.size + 1 })}\n\n`);

  clients.add(res);

  const cleanup = () => {
    clients.delete(res);
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
  res.on('error', cleanup);
}

/**
 * Broadcast an event and JSON payload to all connected SSE clients
 * @param {string} event
 * @param {any} payload
 */
export function broadcast(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch (err) {
      clients.delete(client);
    }
  }
}

/**
 * Returns count of active SSE subscribers
 */
export function getClientCount() {
  return clients.size;
}

// 15-second heartbeat ping to prevent proxy/browser timeout
setInterval(() => {
  for (const client of clients) {
    try {
      client.write(': ping\n\n');
    } catch {
      clients.delete(client);
    }
  }
}, 15000);
