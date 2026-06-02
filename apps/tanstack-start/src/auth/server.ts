import { reactStartCookies } from "better-auth/react-start";

import { initAuth } from "@stock/auth";

import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

export const auth = initAuth({
  baseUrl: getBaseUrl(),
  productionUrl: env.AUTH_URL,
  secret: env.AUTH_SECRET,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,

  extraPlugins: [reactStartCookies()],
});
