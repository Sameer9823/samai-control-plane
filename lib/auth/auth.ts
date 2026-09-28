import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import authConfig from "@/lib/auth/auth.config";

/**
 * lib/auth/auth.ts
 * ---------------------------------------------------------------------------
 * Auth only applies when a database is configured — see middleware.ts and
 * lib/auth/session.ts, which bypass all of this and return a fixed demo
 * identity when DATABASE_URL is unset, so the app still runs with zero
 * setup. When DATABASE_URL *is* set, this Credentials provider looks the
 * user up in Postgres (prisma.user), checks their bcrypt password hash, and
 * embeds their role in a signed JWT — no Account/Session/VerificationToken
 * tables needed, so no @auth/prisma-adapter dependency. This full config
 * (with the Prisma-backed provider) only ever runs in the Node.js runtime
 * (API route handler, server components) — never in Edge middleware, which
 * uses the Prisma-free lib/auth/auth.config.ts instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        if (!prisma) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.hashedPassword) return null;

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
