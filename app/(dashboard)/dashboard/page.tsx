import { PageHeader, MetricCard, Panel, StatusDot, Badge } from "@/components/ui/primitives";
import { TrendChart, TrendBarChart } from "@/components/charts/trend-chart";
import { SamAIClient } from "@/lib/samai/client";
import { formatCost, formatMs, formatNumber, timeAgo } from "@/lib/utils";
import { Activity, Zap, Coins, Timer } from "lucide-react";
import Link from "next/link";

const SERVICES = [
  { name: "SamAI Runtime", latency: "12ms", status: "operational" },
  { name: "Model Providers", latency: "890ms", status: "operational" },
  { name: "Tool Runtime", latency: "210ms", status: "operational" },
  { name: "MCP", latency: "340ms", status: "operational" },
  { name: "Memory", latency: "48ms", status: "operational" },
  { name: "Tracing", latency: "6ms", status: "operational" },
  { name: "Guardrails", latency: "9ms", status: "operational" },
];

export default async function OverviewPage() {
  const [usage, runs, agents] = await Promise.all([
    SamAIClient.getUsageSeries(),
    SamAIClient.listRuns(),
    SamAIClient.listAgents(),
  ]);

  const last7 = usage.slice(-7);
  const prev7 = usage.slice(-14, -7);
  const sum = (arr: typeof usage, key: keyof (typeof usage)[number]) => arr.reduce((a, d) => a + Number(d[key]), 0);
  const pctDelta = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);

  const totalRuns = sum(last7, "runs");
  const totalTokens = sum(last7, "tokens");
  const totalCost = sum(last7, "costUsd");
  const avgLatency = Math.round(last7.reduce((a, d) => a + d.latencyMs, 0) / last7.length);
  const successRate = 100 - (runs.filter((r) => r.status === "failed").length / runs.length) * 100;

  const runsDelta = pctDelta(totalRuns, sum(prev7, "runs"));
  const tokensDelta = pctDelta(totalTokens, sum(prev7, "tokens"));
  const costDelta = pctDelta(totalCost, sum(prev7, "costUsd"));
  const latencyDelta = pctDelta(avgLatency, Math.round(prev7.reduce((a, d) => a + d.latencyMs, 0) / prev7.length));

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const recentRuns = runs.slice(0, 6);

  return (
    <div>
      <PageHeader title="Overview" subtitle="Monitor your AI infrastructure." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Agent Runs (7d)" value={formatNumber(totalRuns)} delta={`${runsDelta >= 0 ? "+" : ""}${runsDelta.toFixed(1)}%`} icon={Activity} />
        <MetricCard label="Success Rate" value={`${successRate.toFixed(1)}%`} delta="+1.2%" icon={Zap} />
        <MetricCard label="Avg Latency" value={formatMs(avgLatency)} delta={`${latencyDelta >= 0 ? "+" : ""}${latencyDelta.toFixed(1)}%`} deltaGood={false} icon={Timer} />
        <MetricCard label="Est. Cost (7d)" value={formatCost(totalCost)} delta={`${costDelta >= 0 ? "+" : ""}${costDelta.toFixed(1)}%`} deltaGood={false} icon={Coins} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Agent runs</span>
            <div className="flex gap-1 text-2xs text-ink-faint">
              {["1H", "24H", "7D", "30D"].map((t, i) => (
                <span key={t} className={`rounded px-1.5 py-0.5 ${i === 3 ? "bg-panel-2 text-ink" : ""}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <TrendChart data={usage} dataKey="runs" color="hsl(238 84% 67%)" />
        </Panel>

        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Active agents</span>
          </div>
          <div className="font-mono-data text-3xl text-ink">{activeAgents}</div>
          <p className="mt-1 text-xs text-ink-dim">of {agents.length} total agents</p>
          <div className="mt-4 space-y-2">
            {agents.map((a) => (
              <Link key={a.id} href={`/agents/${a.id}`} className="flex items-center justify-between rounded px-1 py-1 hover:bg-panel-2">
                <span className="flex items-center gap-2 text-[13px] text-ink">
                  <StatusDot status={a.status} pulse={a.status === "active"} />
                  {a.name}
                </span>
                <span className="text-2xs text-ink-faint">{formatNumber(a.runs)} runs</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Token usage</span>
          <TrendChart data={usage} dataKey="tokens" color="hsl(199 89% 62%)" format="number" height={180} />
        </Panel>
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Estimated cost</span>
          <TrendBarChart data={usage} dataKey="costUsd" color="hsl(158 64% 52%)" format="currency" height={180} />
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Recent runs</span>
            <Link href="/runs" className="text-2xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {recentRuns.map((r) => (
              <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-panel-2">
                <StatusDot status={r.status} pulse={r.status === "running"} />
                <span className="font-mono-data w-24 shrink-0 text-2xs text-ink-faint">{r.id}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.agentName}</span>
                <Badge>{formatMs(r.durationMs)}</Badge>
                <span className="w-16 shrink-0 text-right text-2xs text-ink-faint">{timeAgo(r.startedAt)}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">System health</span>
          <div className="space-y-2.5">
            {SERVICES.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-ink">
                  <StatusDot status={s.status} />
                  {s.name}
                </span>
                <span className="font-mono-data text-2xs text-ink-faint">{s.latency}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
