"use client";

const NODES = [
  { label: "User", sub: "\"Research the latest AI agent infra trends\"" },
  { label: "Research Agent", sub: "gpt-4.1" },
  { label: "web_search", sub: "tool call" },
  { label: "Tool Result", sub: "6 sources" },
  { label: "Writer Agent", sub: "handoff" },
  { label: "Citation Guardrail", sub: "output check" },
  { label: "Response", sub: "delivered" },
];

export function ExecutionGraph() {
  return (
    <div className="rounded-md border border-border-strong bg-panel/60 p-5 backdrop-blur">
      <div className="mb-3 flex items-center gap-1.5 text-2xs text-ink-faint">
        <span className="h-2 w-2 rounded-full bg-err/70" />
        <span className="h-2 w-2 rounded-full bg-warn/70" />
        <span className="h-2 w-2 rounded-full bg-ok/70" />
        <span className="ml-2 font-mono-data">run_8f21a</span>
        <span className="ml-auto font-mono-data text-ok">live</span>
      </div>
      <ol className="space-y-0">
        {NODES.map((n, i) => (
          <li key={n.label} className="relative flex items-center gap-3 py-2 pl-1">
            {i < NODES.length - 1 && (
              <span className="absolute left-[13px] top-[26px] h-[calc(100%-6px)] w-px bg-border-strong" aria-hidden />
            )}
            <span
              className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-bg font-mono-data text-[9px] text-accent"
              style={{ animation: `pulseDot 1.8s ease-in-out ${i * 0.18}s infinite` }}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] text-ink">{n.label}</span>
              <span className="block truncate font-mono-data text-2xs text-ink-faint">{n.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
