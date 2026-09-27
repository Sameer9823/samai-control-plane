import Link from "next/link";
import { SamAIClient } from "@/lib/samai/client";
import { toTraceNodes } from "@/lib/samai/trace-view";
import { PageHeader, Table, Th, Td, StatusBadge, Mono, Panel } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { TraceGraph } from "@/components/traces/trace-graph";
import { TraceTimeline } from "@/components/traces/trace-timeline";
import { formatCost, formatMs, formatNumber } from "@/lib/utils";

export default async function TracesPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run: runId } = await searchParams;
  const runs = await SamAIClient.listRuns();
  const selected = runId ? await SamAIClient.getRun(runId) : runs[0];

  return (
    <div>
      <PageHeader title="Traces" subtitle="Zoom into any run's execution graph — every model call, tool call, and handoff." />

      {selected && (
        <Panel className="mb-5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mono className="text-[13px] font-medium text-ink">{selected.id}</Mono>
              <StatusBadge status={selected.status} />
            </div>
            <Link href={`/runs/${selected.id}`} className="text-2xs text-accent hover:underline">
              Full run detail →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <TraceGraph trace={selected.trace} />
          </div>
        </Panel>
      )}

      {selected && (
        <div className="mb-6">
          <h2 className="mb-3 text-[13px] font-medium text-ink">Node inspector</h2>
          <TraceTimeline nodes={toTraceNodes(selected.trace)} />
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-medium text-ink">All traces</h2>
      <Table>
        <thead>
          <tr>
            <Th>Trace ID</Th>
            <Th>Run</Th>
            <Th>Agent</Th>
            <Th>Duration</Th>
            <Th>Tokens</Th>
            <Th>Cost</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {runs.slice(0, 40).map((r) => (
            <ClickableRow key={r.id} href={`/traces?run=${r.id}`}>
              <Td><Mono>{r.trace.runId}</Mono></Td>
              <Td><Mono className="text-ink-dim">{r.id}</Mono></Td>
              <Td>{r.agentName}</Td>
              <Td>{formatMs(r.durationMs)}</Td>
              <Td>{formatNumber(r.tokens)}</Td>
              <Td>{formatCost(r.costUsd)}</Td>
              <Td><StatusBadge status={r.status} /></Td>
            </ClickableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
