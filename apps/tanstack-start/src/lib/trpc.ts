import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  createTRPCClient,
  createWSClient,
  httpBatchStreamLink,
  loggerLink,
  splitLink,
  unstable_localLink,
  wsLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import * as Api from "@stock/api";

import { auth } from "~/auth/server";
import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

export const makeTRPCClient = createIsomorphicFn()
  .server(() => {
    return createTRPCClient<Api.AppRouter>({
      links: [
        unstable_localLink({
          router: Api.appRouter,
          transformer: SuperJSON,
          createContext: () => {
            const headers = new Headers(getRequestHeaders());
            headers.set("x-trpc-source", "tanstack-start-server");
            return Api.createTRPCContext({ auth, headers });
          },
        }),
      ],
    });
  })
  .client(() => {
    const wsClient = createWSClient({ url: env.VITE_TICKER_WS_URL });
    return createTRPCClient<Api.AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => op.path.startsWith("ticker."),
          true: wsLink({ client: wsClient, transformer: SuperJSON }),
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/api/trpc",
            headers() {
              const headers = new Headers();
              headers.set("x-trpc-source", "tanstack-start-client");
              return headers;
            },
          }),
        }),
      ],
    });
  });

export const { useTRPC, TRPCProvider } = createTRPCContext<Api.AppRouter>();
