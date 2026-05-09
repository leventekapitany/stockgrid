import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@acme/api";
import { initAuth } from "@acme/auth";

import { poller } from "./poller";

const PORT = Number(process.env.TICKER_PORT ?? 4001);

const auth = initAuth({
  baseUrl: `http://localhost:${PORT}`,
  productionUrl: `http://localhost:${PORT}`,
  secret: process.env.AUTH_SECRET,
  discordClientId: process.env.AUTH_DISCORD_ID ?? "",
  discordClientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
});

const wss = new WebSocketServer({ port: PORT });

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

console.log(`[ticker] ws listening on :${PORT}`);

const shutdown = () => {
  console.log("[ticker] shutting down");
  handler.broadcastReconnectNotification();
  wss.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
