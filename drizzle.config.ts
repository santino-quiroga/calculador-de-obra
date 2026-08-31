import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migraciones",
  dialect: "sqlite",
  dbCredentials: {
    url: "./datos/obra.db",
  },
} satisfies Config;
