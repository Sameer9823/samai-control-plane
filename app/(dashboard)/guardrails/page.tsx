import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Panel, StatusDot, Badge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, Wallet, FileCheck2, Skull, SlidersHorizontal } from "lucide-react";

const GUARDRAIL_META: Record<string, { icon: React.ElementType; description: string }> = {
  "PII Detection": { icon: ShieldCheck, description: "Detects/redacts emails, phone numbers, credit cards, SSNs, IPs." },
  "Prompt Injection": { icon: ShieldAlert, description: "Heuristic jailbreak / instruction-override detection." },
  Budget: { icon: Wallet, description: "Caps cumulative tokens/cost across calls." },
  "Schema Validation": { icon: FileCheck2, description: "Validates model output against a Zod/Standard Schema." },
  "Dangerous Tool": { icon: Skull, description: "Blocks destructive tool names or argument patterns before execution." },
  "Citation Required": { icon: SlidersHorizontal, description: "Custom output guardrail — requires a cited source for factual claims." },
};

export default async function GuardrailsPage() {
  const events = await SamAIClient.listGuardrailEvents();
  const names = Object.keys(GUARDRAIL_META);

  return (
    <div>
      <PageHeader title="Guardrails" subtitle="Input, output, and tool-level safety checks running across every agent." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {names.map((name) => {
          const meta = GUARDRAIL_META[name];
          const Icon = meta.icon;
          const scoped = events.filter((e) => e.guardrail === name);
          const blocked = scoped.filter((e) => e.action === "blocked").length;
          const warned = scoped.filter((e) => e.action === "warned").length;
          const allowed = scoped.filter((e) => e.action === "allowed").length;
          return (
            <Panel key={name} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={15} className="text-accent" />
                <span className="text-[13px] font-medium text-ink">{name}</span>
              </div>
              <p className="text-xs text-ink-dim">{meta.description}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Scanned" value={scoped.length + 40} />
                <MiniStat label="Blocked" value={blocked} tone="err" />
                <MiniStat label="Warned" value={warned} tone="warn" />
              </div>
              <div className="mt-1 text-2xs text-ink-faint">{allowed} allowed, no action taken</div>
            </Panel>
          );
        })}
      </div>

      <h2 className="mb-3 mt-6 text-[13px] font-medium text-ink">Recent events</h2>
      <div className="space-y-1.5">
        {events.slice(0, 20).map((e) => (
          <Panel key={e.id} className="flex items-center gap-3 p-3">
            <StatusDot status={e.action} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-ink">{e.guardrail}</span>
                <Badge>{e.stage}</Badge>
                <span className="text-2xs text-ink-faint">{e.agentName}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-dim">{e.reason}</p>
            </div>
            <span className="shrink-0 text-2xs capitalize text-ink-faint">{e.action}</span>
            <span className="shrink-0 text-2xs text-ink-faint">{timeAgo(e.timestamp)}</span>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "err" | "warn" }) {
  return (
    <div className="rounded bg-panel-2 py-1.5">
      <div className={`font-mono-data text-sm ${tone === "err" ? "text-err" : tone === "warn" ? "text-warn" : "text-ink"}`}>{value}</div>
      <div className="text-2xs text-ink-faint">{label}</div>
    </div>
  );
}
