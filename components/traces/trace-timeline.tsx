"use client";

import { useState } from "react";
import type { TraceNode } from "@/lib/samai/trace-view";
import { cn } from "@/lib/utils";
import { Mono, Badge } from "@/components/ui/primitives";
import {
  MessageSquare,
  Brain,
  Wrench,
  GitBranch,
  ShieldAlert,
  ClipboardCheck,
  RotateCcw,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

const ICONS: Record<TraceNode["kind"], React.ElementType> = {
  start: MessageSquare,
  model: Brain,
  tool: Wrench,
  handoff: GitBranch,
  guardrail: ShieldAlert,
  approval: ClipboardCheck,
  retry: RotateCcw,
  fallback: ArrowRightLeft,
  timeout: Clock,
  final: CheckCircle2,
  failed: XCircle,
};

const COLORS: Record<TraceNode["kind"], string> = {
  start: "text-ink-dim border-border-strong",
  model: "text-accent border-accent/40",
  tool: "text-info border-info/40",
  handoff: "text-[hsl(280,70%,70%)] border-[hsl(280,70%,70%)]/40",
  guardrail: "text-warn border-warn/40",
  approval: "text-warn border-warn/40",
  retry: "text-warn border-warn/40",
  fallback: "text-warn border-warn/40",
  timeout: "text-err border-err/40",
  final: "text-ok border-ok/40",
  failed: "text-err border-err/40",
};

export function TraceTimeline({ nodes }: { nodes: TraceNode[] }) {
  const [selected, setSelected] = useState<TraceNode | null>(nodes.find((n) => n.kind !== "start") ?? null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="relative rounded-md border border-border bg-panel p-5">
        <div className="absolute bottom-8 left-[27px] top-8 w-px bg-border-strong" aria-hidden />
        <ol className="space-y-1">
          {nodes.map((node) => {
            const Icon = ICONS[node.kind];
            const isSelected = selected?.id === node.id;
            return (
              <li key={node.id}>
                <button
                  onClick={() => setSelected(node)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors",
                    isSelected ? "bg-panel-2" : "hover:bg-panel-2/60"
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-panel",
                      COLORS[node.kind]
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">{node.title}</span>
                      {node.subtitle && (
                        <Mono className="truncate text-2xs text-ink-faint">{node.subtitle}</Mono>
                      )}
                    </span>
                    <span className="mt-0.5 block text-2xs text-ink-faint">{node.agentName}</span>
                  </span>
                  {node.durationMs !== undefined && (
                    <Badge className="shrink-0">{node.durationMs}ms</Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-md border border-border bg-panel p-4 lg:sticky lg:top-[76px] lg:h-fit">
        {!selected ? (
          <p className="text-sm text-ink-faint">Select a node in the timeline to inspect it.</p>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-ink">{selected.title}</div>
                {selected.subtitle && <Mono className="text-2xs text-ink-faint">{selected.subtitle}</Mono>}
              </div>
              <button onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <dl className="space-y-2 text-[13px]">
              {Object.entries(selected.detail)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <dt className="shrink-0 text-ink-faint">{k}</dt>
                    <dd className="break-all text-right font-mono-data text-[12px] text-ink">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
