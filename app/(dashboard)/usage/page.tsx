import { PageHeader, Panel, Badge } from "@/components/ui/primitives";
import { TrendChart, TrendBarChart } from "@/components/charts/trend-chart";
import { SamAIClient } from "@/lib/samai/client";
import { formatCost, formatNumber } from "@/lib/utils";

export default async function UsagePage() {
  const [usage, agents, tools] = await Promise.all([SamAIClient.getUsageSeries(), SamAIClient.listAgents(), SamAIClient.listTools()]);

  const totalRuns = usage.reduce((a, d) => a + d.runs, 0);
  const totalTokens = usage.reduce((a, d) => a + d.tokens, 0);
  const totalCost = usage.reduce((a, d) => a + d.costUsd, 0);
  const totalToolCalls = usage.reduce((a, d) => a + d.toolCalls, 0);

  return (
    <div>
      <PageHeader title="Usage" subtitle="Requests, tokens, tool calls, cost, and latency across the last 30 days." />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Requests</span>
          <TrendChart data={usage} dataKey="runs" format="number" />
        </Panel>
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Tokens</span>
          <TrendChart data={usage} dataKey="tokens" color="hsl(199 89% 62%)" format="number" />
        </Panel>
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Tool calls</span>
          <TrendBarChart data={usage} dataKey="toolCalls" color="hsl(280 70% 70%)" format="number" />
        </Panel>
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">Cost</span>
          <TrendBarChart data={usage} dataKey="costUsd" color="hsl(158 64% 52%)" format="currency" />
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">By agent</span>
          <div className="space-y-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-[13px]">
                <span className="text-ink">{a.name}</span>
                <div className="flex items-center gap-3 text-2xs text-ink-faint">
                  <span>{formatNumber(a.tokens)} tok</span>
                  <span>{formatCost(a.costUsd)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <span className="mb-3 block text-[13px] font-medium text-ink">By tool</span>
          <div className="space-y-2">
            {tools.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-[13px]">
                <span className="text-ink">{t.name}</span>
                <Badge>{formatNumber(t.calls)} calls</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-3 p-4">
        <span className="mb-1 block text-2xs uppercase tracking-wide text-ink-faint">30-day totals (estimated)</span>
        <div className="mt-2 flex flex-wrap gap-6 font-mono-data text-sm text-ink">
          <span>{formatNumber(totalRuns)} runs</span>
          <span>{formatNumber(totalTokens)} tokens</span>
          <span>{formatNumber(totalToolCalls)} tool calls</span>
          <span>{formatCost(totalCost)} cost</span>
        </div>
      </Panel>
    </div>
  );
}
