import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@stock/db/client";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  secret: string | undefined;

  productionUrl?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  extraPlugins?: TExtraPlugins;
}) {
  const socialProviders =
    options.googleClientId && options.googleClientSecret
      ? {
          google: {
            clientId: options.googleClientId,
            clientSecret: options.googleClientSecret,
            redirectURI: `${options.baseUrl}/api/auth/callback/google`,
          },
        }
      : undefined;

  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl ?? options.baseUrl,
      }),
      expo(),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders,
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
