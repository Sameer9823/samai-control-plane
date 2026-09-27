import type { NextAuthConfig } from "next-auth";

/**
 * lib/auth/auth.config.ts
 * ---------------------------------------------------------------------------
 * Split out from lib/auth/auth.ts specifically so middleware.ts (which runs
 * on the Edge runtime) can verify the signed JWT session cookie without
 * pulling in the Credentials provider's `authorize()` — that callback needs
 * Prisma + bcrypt, which need the Node.js runtime, not Edge. Since role is
 * already embedded in the JWT (see the `jwt`/`session` callbacks below),
 * middleware never needs to touch Postgres to know who's signed in.
 */
export default {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [], // real providers (Credentials + Prisma) live in lib/auth/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role as never;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role as never;
      return session;
    },
  },
} satisfies NextAuthConfig;
