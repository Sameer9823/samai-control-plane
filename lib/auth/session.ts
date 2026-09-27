import "server-only";
import type { Role } from "@/lib/auth/rbac";

const USE_DATABASE = !!process.env.DATABASE_URL;

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const DEMO_USER: CurrentUser = {
  id: "demo-owner",
  name: "Sameer",
  email: "sameer@acme.ai",
  role: "OWNER",
};

/**
 * Returns the signed-in user for the current request. In demo mode (no
 * DATABASE_URL) this is always a fixed OWNER identity — there's no
 * meaningful "account" to log into against in-memory data, so login is
 * skipped entirely (see middleware.ts). Once DATABASE_URL is set, this
 * reads the real Auth.js JWT session.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!USE_DATABASE) return DEMO_USER;

  // Dynamic import: lib/auth/auth.ts pulls in Prisma + bcrypt, which only
  // need to load at all once a database is actually configured.
  const { auth } = await import("@/lib/auth/auth");
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id ?? "",
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    role: session.user.role,
  };
}
