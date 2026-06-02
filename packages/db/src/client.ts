import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("Missing POSTGRES_URL");
}

export const postgresClient = postgres(connectionString, {
  max: 5,
  prepare: false,
});

export const db = drizzle(postgresClient, {
  schema,
  casing: "snake_case",
});
