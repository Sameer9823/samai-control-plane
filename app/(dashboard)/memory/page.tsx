import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Panel, Badge, Mono } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/utils";
import { Search } from "lucide-react";

function MemoryList({ records }: { records: Awaited<ReturnType<typeof SamAIClient.listMemory>> }) {
  if (records.length === 0) return <p className="text-sm text-ink-faint">No records of this type yet.</p>;
  return (
    <div className="space-y-2">
      {records.map((m) => (
        <Panel key={m.id} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Mono className="text-2xs text-ink-faint">{m.id}</Mono>
                <Badge>{m.source}</Badge>
                <span className="text-2xs text-ink-faint">v{m.version}</span>
              </div>
              <p className="mt-1 text-[13px] text-ink">{m.content}</p>
              {m.relationships && m.relationships.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.relationships.map((r, i) => (
                    <Badge key={i} variant="accent">
                      {r.predicate} → {r.target}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right text-2xs text-ink-faint">
              <div>{Math.round(m.confidence * 100)}% confidence</div>
              <div>{timeAgo(m.updatedAt)}</div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function GraphView({ records }: { records: Awaited<ReturnType<typeof SamAIClient.listMemory>> }) {
  const graphRecords = records.filter((r) => r.relationships && r.relationships.length > 0);
  const centerX = 90;
  const centerY = 160;
  return (
    <Panel className="p-6">
      <svg viewBox="0 0 620 320" className="w-full" style={{ minWidth: 500 }}>
        <circle cx={centerX} cy={centerY} r={30} fill="hsl(220 14% 10%)" stroke="hsl(238 84% 67%)" strokeWidth={1.5} />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fontSize="10" fill="hsl(220 20% 92%)" fontFamily="var(--font-mono)">
          User
        </text>
        {graphRecords.flatMap((rec, ri) =>
          (rec.relationships ?? []).map((rel, i) => {
            const idx = ri * 4 + i;
            const angle = (idx / (graphRecords.length * 2 + 1)) * Math.PI - Math.PI / 2.3;
            const radius = 240;
            const x = centerX + 210 + Math.cos(angle) * 40;
            const y = centerY + Math.sin(idx * 1.7) * 120;
            return (
              <g key={`${rec.id}-${i}`}>
                <line x1={centerX + 30} y1={centerY} x2={x - 55} y2={y} stroke="hsl(220 12% 22%)" strokeWidth={1} />
                <text
                  x={(centerX + 30 + x - 55) / 2}
                  y={(centerY + y) / 2 - 6}
                  fontSize="8"
                  fill="hsl(220 9% 62%)"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {rel.predicate}
                </text>
                <rect x={x - 55} y={y - 16} width={140} height={32} rx={6} fill="hsl(220 14% 10%)" stroke="hsl(199 89% 62% / 0.5)" />
                <text x={x + 15} y={y + 4} textAnchor="middle" fontSize="9" fill="hsl(199 89% 62%)" fontFamily="var(--font-mono)">
                  {rel.target.length > 18 ? rel.target.slice(0, 17) + "…" : rel.target}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </Panel>
  );
}

export default async function MemoryPage() {
  const memory = await SamAIClient.listMemory();

  return (
    <div>
      <PageHeader title="Memory" subtitle="Sessions, embedded knowledge, and the relationship graph agents have built up." />

      <div className="mb-4 flex h-8 max-w-sm items-center gap-2 rounded border border-border-strong bg-panel px-2.5 text-ink-faint">
        <Search size={14} />
        <span className="text-[13px]">Search memory…</span>
      </div>

      <Tabs
        tabs={[
          { key: "graph", label: "Graph", content: <GraphView records={memory} /> },
          { key: "sessions", label: "Sessions", content: <MemoryList records={memory.filter((m) => m.type === "session")} /> },
          { key: "vector", label: "Vector", content: <MemoryList records={memory.filter((m) => m.type === "vector")} /> },
          { key: "facts", label: "Facts", content: <MemoryList records={memory.filter((m) => m.type === "fact" || m.type === "graph")} /> },
        ]}
      />
    </div>
  );
}
