import Link from "next/link";
import { ExecutionGraph } from "@/components/marketing/execution-graph";
import { Bot, Waypoints, ShieldCheck, Gauge, GitBranch, Cpu } from "lucide-react";

const FEATURES = [
  { icon: Bot, title: "Build", body: "Define agents, tools, memory, and guardrails in a config-driven builder — deploy the same unit across dev, staging, and production." },
  { icon: Waypoints, title: "Observe", body: "Every run produces a full trace — model calls, tool calls, handoffs, retries — before you even ask for it." },
  { icon: ShieldCheck, title: "Secure", body: "PII redaction, prompt-injection detection, and approval gates that fail closed by default, not as an afterthought." },
  { icon: GitBranch, title: "Debug", body: "Open any run and see exactly what happened, why, and what it cost — down to the individual tool call." },
  { icon: Cpu, title: "Scale", body: "Eight provider adapters behind one interface. Swap Anthropic for OpenAI without touching your agent, tools, or tracing." },
  { icon: Gauge, title: "Evaluate", body: "Regression-test agent versions against a dataset before they ship, with pass rate and latency tracked over time." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
            <span className="font-mono-data text-[11px] font-bold text-white">S</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight">SamAI Control Plane</span>
        </div>
        <nav className="flex items-center gap-6 text-[13px] text-ink-dim">
          <Link href="/docs" className="hover:text-ink">Documentation</Link>
          <a href="https://github.com/Sameer9823/samai-sdk" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub</a>
          <Link href="/dashboard" className="rounded border border-border-strong bg-panel px-3 py-1.5 hover:border-ink-faint">
            Open Dashboard
          </Link>
        </nav>
      </header>

      <section className="bg-grid relative mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-block font-mono-data text-2xs tracking-wide text-accent">Build. Run. Observe. Scale.</span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Production infrastructure<br />for AI agents.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-dim">
              SamAI Control Plane gives engineering teams one place to build, monitor, debug, secure, and scale AI agents built with SamAI SDK.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Link href="/agents/new" className="rounded border border-accent/40 bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent/90">
                Start Building
              </Link>
              <Link href="/docs" className="rounded border border-border-strong bg-panel px-4 py-2 text-[13px] font-medium text-ink hover:border-ink-faint">
                View Documentation
              </Link>
            </div>
            <p className="mt-6 font-mono-data text-2xs text-ink-faint">
              npm install samai-sdk
            </p>
          </div>
          <ExecutionGraph />
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-border px-6 py-16">
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight">
          Your AI agents are no longer black boxes.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-md border border-border bg-panel p-5">
                <Icon size={18} className="text-accent" />
                <h3 className="mt-3 text-[15px] font-medium">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-2xs text-ink-faint">
        SamAI Control Plane — the operating layer for production AI agents.
      </footer>
    </div>
  );
}
