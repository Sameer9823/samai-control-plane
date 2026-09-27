import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";

async function authenticate(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-panel p-6">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
            <span className="font-mono-data text-[11px] font-bold text-white">S</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-ink">SamAI Control Plane</span>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-ink">Sign in</h1>
        <p className="mb-5 text-sm text-ink-dim">Sign in to your workspace to continue.</p>

        {error && (
          <div className="mb-4 rounded border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">
            Invalid email or password.
          </div>
        )}

        <form action={authenticate} className="space-y-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
          <label className="block">
            <span className="mb-1.5 block text-2xs uppercase tracking-wide text-ink-faint">Email</span>
            <input name="email" type="email" required className="input" placeholder="you@company.com" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-2xs uppercase tracking-wide text-ink-faint">Password</span>
            <input name="password" type="password" required className="input" placeholder="••••••••" />
          </label>
          <button
            type="submit"
            className="mt-2 w-full rounded border border-accent/40 bg-accent px-3 py-2 text-[13px] font-medium text-white hover:bg-accent/90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-2xs text-ink-faint">
          Seeded accounts (see <span className="font-mono-data">prisma/seed.ts</span>): owner@acme.ai / admin@acme.ai /
          dev@acme.ai / viewer@acme.ai — password <span className="font-mono-data">samai-demo</span> for all four.
        </p>
      </div>
    </div>
  );
}
