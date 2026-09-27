import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth/auth.config";

const USE_DATABASE = !!process.env.DATABASE_URL;

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Demo mode (no DATABASE_URL): there's no real account system behind the
  // in-memory dataset, so skip auth entirely rather than gate access behind
  // a login screen with nothing to log into.
  if (!USE_DATABASE) return NextResponse.next();

  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  // Runs on every route except static assets and the marketing landing page
  // (which stays public even in DB mode — only the dashboard is gated).
  matcher: ["/dashboard/:path*", "/agents/:path*", "/runs/:path*", "/traces/:path*", "/tools/:path*", "/mcp/:path*", "/memory/:path*", "/guardrails/:path*", "/approvals/:path*", "/models/:path*", "/sessions/:path*", "/evaluations/:path*", "/usage/:path*", "/settings/:path*", "/docs/:path*", "/login"],
};
