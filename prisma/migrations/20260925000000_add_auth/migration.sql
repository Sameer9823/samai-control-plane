-- Adds password storage for Auth.js Credentials-provider login.
-- Sessions use the JWT strategy (role embedded in the token), so no
-- Account/Session/VerificationToken tables are needed — see lib/auth/auth.ts.
ALTER TABLE "users" ADD COLUMN "hashedPassword" TEXT;
