import "server-only";
import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: avoids exhausting Postgres connections
// from a fresh PrismaClient on every hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 requires a driver adapter to connect to the database.
// In demo mode (no DATABASE_URL) we skip initialization entirely so the app
// runs with zero configuration — SamAIClient.ts checks `USE_DATABASE` before
// touching `prisma`.
let prisma: PrismaClient | undefined;

if (process.env.DATABASE_URL) {
  // Dynamic require keeps `@prisma/adapter-pg` out of the demo-mode import
  // graph (it's only installed when you intend to use Postgres).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
}

if (process.env.NODE_ENV !== "production" && prisma) globalForPrisma.prisma = prisma;

export { prisma };
