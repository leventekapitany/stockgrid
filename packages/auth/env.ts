import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  const isProduction = process.env.NODE_ENV === "production";

  return createEnv({
    server: {
      AUTH_URL: isProduction
        ? z.url()
        : z.url().default("http://localhost:3000"),
      AUTH_GOOGLE_ID: isProduction ? z.string().min(1) : z.string().default(""),
      AUTH_GOOGLE_SECRET: isProduction
        ? z.string().min(1)
        : z.string().default(""),
      AUTH_SECRET:
        isProduction ? z.string().min(1) : z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
