import { notFound } from "next/navigation";
import Link from "next/link";
import { SamAIClient } from "@/lib/samai/client";
import { toTraceNodes } from "@/lib/samai/trace-view";
import { StatusBadge, Badge, Mono, Button } from "@/components/ui/primitives";
import { TraceTimeline } from "@/components/traces/trace-timeline";
import { formatCost, formatMs, formatNumber, timeAgo } from "@/lib/utils";
import { RotateCcw, Waypoints, FileText } from "lucide-react";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await SamAIClient.getRun(runId);
  if (!run) notFound();

  const agent = await SamAIClient.getAgent(run.agentId);
  const nodes = toTraceNodes(run.trace);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-2xs text-ink-faint">
        <Link href="/runs" className="hover:text-ink">
          Runs
        </Link>
        <span>/</span>
        <Mono>{run.id}</Mono>
      </div>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Mono className="text-[20px] font-semibold text-ink">{run.id}</Mono>
            <StatusBadge status={run.status} />
            <Badge variant={run.environment === "production" ? "accent" : "default"}>{run.environment}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-dim">&ldquo;{run.input}&rdquo;</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {run.status === "failed" && (
            <Button variant="outline" size="sm">
              <RotateCcw size={13} /> Retry
            </Button>
          )}
          <Button href={`/traces?run=${run.id}`} variant="outline" size="sm">
            <Waypoints size={13} /> Open in Traces
          </Button>
          <Button variant="outline" size="sm">
            <FileText size={13} /> View Logs
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Meta label="Agent" value={agent ? <Link href={`/agents/${agent.id}`} className="text-accent hover:underline">{agent.name}</Link> : run.agentName} />
        <Meta label="Environment" value={run.environment} />
        <Meta label="Duration" value={formatMs(run.durationMs)} />
        <Meta label="Tokens" value={formatNumber(run.tokens)} />
        <Meta label="Cost" value={formatCost(run.costUsd)} />
        <Meta label="Started" value={timeAgo(run.startedAt)} />
        <Meta label="Agent path" value={run.trace.agentPath.join(" → ")} />
      </div>

      {run.status === "failed" && (
        <div className="mb-5 rounded-md border border-err/30 bg-err/5 p-4">
          <div className="mb-1 text-[13px] font-medium text-err">RUN FAILED</div>
          <p className="font-mono-data text-[12.5px] text-ink-dim">
            {run.trace.events.find((e) => e.type === "run-failed")?.type === "run-failed"
              ? (run.trace.events.find((e) => e.type === "run-failed") as { error: string }).error
              : "Unknown error"}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm">
              <RotateCcw size={13} /> Retry
            </Button>
            <Button variant="outline" size="sm">
              Inspect Trace
            </Button>
            <Button variant="outline" size="sm">
              View Logs
            </Button>
          </div>
        </div>
      )}

      {run.status === "waiting_approval" && (
        <div className="mb-5 rounded-md border border-warn/30 bg-warn/5 p-4">
          <div className="mb-1 text-[13px] font-medium text-warn">WAITING ON HUMAN APPROVAL</div>
          <p className="text-[13px] text-ink-dim">This run paused before executing an approval-gated tool. Resolve it from the Approval Center.</p>
          <Button href="/approvals" size="sm" className="mt-3">
            Open Approval Center
          </Button>
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-medium text-ink">Execution Timeline</h2>
      <TraceTimeline nodes={nodes} />

      {run.output && (
        <div className="mt-5 rounded-md border border-border bg-panel p-4">
          <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Final Response</span>
          <p className="text-[13px] leading-relaxed text-ink">{run.output}</p>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-panel p-2.5">
      <div className="text-2xs text-ink-faint">{label}</div>
      <div className="mt-0.5 truncate text-[13px] capitalize text-ink">{value}</div>
    </div>
  );
}
