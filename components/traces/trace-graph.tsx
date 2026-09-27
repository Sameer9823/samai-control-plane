import type { RunTrace } from "@/lib/samai/types";

export function TraceGraph({ trace }: { trace: RunTrace }) {
  // Build a simple layered graph: root agent -> tool calls it made -> handoff target -> its tool calls.
  type Layer = { agent: string; tools: string[] }[];
  const layers: Layer = [];
  let current: { agent: string; tools: string[] } | null = null;
  for (const e of trace.events) {
    if (e.type === "run-started") {
      current = { agent: e.agentName, tools: [] };
      layers.push(current);
    } else if (e.type === "tool-call" && current) {
      if (!current.tools.includes(e.toolName)) current.tools.push(e.toolName);
    } else if (e.type === "handoff") {
      current = { agent: e.toAgent, tools: [] };
      layers.push(current);
    }
  }

  const colW = 220;
  const width = Math.max(560, layers.length * colW);
  const height = 60 + Math.max(...layers.map((l) => l.tools.length), 1) * 46 + 40;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 560 }}>
      {layers.map((layer, i) => {
        const x = 100 + i * colW;
        const rootY = 30;
        return (
          <g key={layer.agent + i}>
            {i > 0 && (
              <line
                x1={100 + (i - 1) * colW}
                y1={rootY}
                x2={x}
                y2={rootY}
                stroke="hsl(238 84% 67% / 0.5)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="animate-flowDash"
              />
            )}
            <circle cx={x} cy={rootY} r={26} fill="hsl(220 14% 10%)" stroke="hsl(238 84% 67%)" strokeWidth={1.5} />
            <text x={x} y={rootY + 4} textAnchor="middle" fontSize="9" fill="hsl(220 20% 92%)" fontFamily="var(--font-mono)">
              {layer.agent.length > 14 ? layer.agent.slice(0, 13) + "…" : layer.agent}
            </text>
            {layer.tools.map((tool, ti) => {
              const ty = rootY + 60 + ti * 46;
              return (
                <g key={tool}>
                  <line x1={x} y1={rootY + 26} x2={x} y2={ty - 16} stroke="hsl(220 12% 22%)" strokeWidth={1} />
                  <rect x={x - 60} y={ty - 16} width={120} height={32} rx={6} fill="hsl(220 14% 10%)" stroke="hsl(199 89% 62% / 0.5)" />
                  <text x={x} y={ty + 4} textAnchor="middle" fontSize="9" fill="hsl(199 89% 62%)" fontFamily="var(--font-mono)">
                    {tool}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
