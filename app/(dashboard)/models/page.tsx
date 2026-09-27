import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Panel, StatusBadge, Mono, Badge } from "@/components/ui/primitives";
import { formatCost, formatMs, formatNumber } from "@/lib/utils";

export default async function ModelsPage() {
  const providers = await SamAIClient.listModelProviders();

  return (
    <div>
      <PageHeader title="Models" subtitle="Every provider adapter samai-sdk can route to — swap one line, nothing else changes." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => (
          <Panel key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">{p.name}</span>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.models.map((m) => (
                <Badge key={m}><Mono>{m}</Mono></Badge>
              ))}
            </div>
            <dl className="mt-3 space-y-1.5 text-2xs">
              <div className="flex justify-between"><dt className="text-ink-faint">Requests</dt><dd className="text-ink">{formatNumber(p.requests)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">Latency</dt><dd className="text-ink">{formatMs(p.latencyMs)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">Cost</dt><dd className="text-ink">{formatCost(p.costUsd)}</dd></div>
            </dl>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5 max-w-md p-4">
        <span className="mb-3 block text-2xs uppercase tracking-wide text-ink-faint">Routing configuration</span>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-ink-dim">Primary model</span>
            <Badge variant="accent">OpenAI · gpt-4.1</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-dim">Fallback model</span>
            <Badge>Anthropic · claude-sonnet-4-6</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-dim">Retries</span>
            <Mono>2</Mono>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-dim">Timeout</span>
            <Mono>30000ms</Mono>
          </div>
        </div>
        <p className="mt-3 text-2xs text-ink-faint">Backed by <Mono className="text-2xs">createResilientProvider()</Mono> from samai-sdk.</p>
      </Panel>
    </div>
  );
}
