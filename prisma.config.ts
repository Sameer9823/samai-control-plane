/**
 * Prisma config (Prisma 7+). Connection URLs for Migrate / Studio / Seed live
 * here — the datasource `url` in schema.prisma was removed in Prisma 7. See
 * the transparency note in README.md's Database section.
 */
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
