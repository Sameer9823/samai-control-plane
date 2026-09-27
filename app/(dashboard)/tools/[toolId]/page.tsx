import { notFound } from "next/navigation";
import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Button, Badge, Mono, StatusBadge, Panel, Table, Th, Td } from "@/components/ui/primitives";
import { formatMs, formatNumber, timeAgo } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

export default async function ToolDetailPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const tool = await SamAIClient.getTool(toolId);
  if (!tool) notFound();

  const runs = await SamAIClient.listRuns();
  const recentCalls = runs
    .flatMap((r) =>
      r.trace.events
        .filter((e) => e.type === "tool-call" && e.toolName === tool.name)
        .map((e) => ({ run: r, event: e as Extract<typeof e, { type: "tool-call" }> }))
    )
    .slice(0, 10);

  return (
    <div>
      <PageHeader
        title={tool.name}
        subtitle={tool.description}
        actions={
          <Button variant="outline" size="sm">
            <FlaskConical size={13} /> Test Tool
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Schema</span>
          <pre className="overflow-x-auto rounded bg-panel-2 p-3 font-mono-data text-[12.5px] text-ink-dim">
{JSON.stringify(tool.schema, null, 2)}
          </pre>

          <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Recent calls</span>
          <Table>
            <thead>
              <tr>
                <Th>Run</Th>
                <Th>Arguments</Th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(({ run, event }, i) => (
                <tr key={i}>
                  <Td><Mono>{run.id}</Mono></Td>
                  <Td className="font-mono-data text-2xs text-ink-dim">{JSON.stringify(event.args)}</Td>
                </tr>
              ))}
              {recentCalls.length === 0 && (
                <tr>
                  <Td colSpan={2} className="text-ink-faint">No recorded calls in the sampled run history.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Panel>

        <Panel className="p-4">
          <span className="mb-3 block text-2xs uppercase tracking-wide text-ink-faint">Details</span>
          <dl className="space-y-2.5 text-[13px]">
            <Row label="Type" value={<Badge>{tool.type}</Badge>} />
            <Row label="Status" value={<StatusBadge status={tool.status} />} />
            <Row label="Calls" value={formatNumber(tool.calls)} />
            <Row label="Success rate" value={`${tool.successRate}%`} />
            <Row label="Avg latency" value={formatMs(tool.avgLatencyMs)} />
            <Row label="Approval" value={tool.requiresApproval ? "Required" : "Not required"} />
          </dl>

          <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Used by</span>
          <div className="flex flex-wrap gap-1.5">
            {tool.agents.map((a) => (
              <Badge key={a}>{a}</Badge>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
