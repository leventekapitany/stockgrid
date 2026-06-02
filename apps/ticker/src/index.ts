import { createServer } from "node:http";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@stock/api";
import { initAuth } from "@stock/auth";

import { poller } from "./poller";

const PORT = Number(process.env.PORT ?? process.env.TICKER_PORT ?? 4001);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "stock-ticker" }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("stock ticker websocket service\n");
});

const auth = initAuth({
  baseUrl: `http://localhost:${PORT}`,
  secret: process.env.AUTH_SECRET,
});

const wss = new WebSocketServer({ server });

const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: ({ req }) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (value !== undefined) headers.set(key, value);
    }
    return createTRPCContext({ auth, headers, marketData: poller });
  },
});

wss.on("connection", (ws) => {
  console.log(`[ticker] +1 connection (${wss.clients.size} total)`);
  ws.once("close", () => {
    console.log(`[ticker] -1 connection (${wss.clients.size} total)`);
  });
});

server.listen(PORT, () => {
  console.log(`[ticker] http/ws listening on :${PORT}`);
});

let isShuttingDown = false;

const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("[ticker] shutting down");
  handler.broadcastReconnectNotification();
  wss.close();
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
