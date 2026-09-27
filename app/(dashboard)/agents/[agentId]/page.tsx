import { notFound } from "next/navigation";
import Link from "next/link";
import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Button, StatusBadge, Badge, Mono, MetricCard, Panel, Table, Th, Td, StatusDot } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { Tabs } from "@/components/ui/tabs";
import { formatCost, formatMs, formatNumber, timeAgo } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAgents } from "@/lib/auth/rbac";
import { RunAgentPanel } from "@/components/agents/run-agent-panel";
import { Play } from "lucide-react";
import { AgentActionButtons } from "@/components/agents/agent-action-buttons";

export default async function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = await SamAIClient.getAgent(agentId);
  if (!agent) notFound();

  const [runs, tools, memory, guardrailEvents, user] = await Promise.all([
    SamAIClient.listRuns({ agentId }).then((r) => r.slice(0, 30)),
    SamAIClient.listTools(),
    SamAIClient.listMemory(),
    SamAIClient.listGuardrailEvents(),
    getCurrentUser(),
  ]);
  const canManage = user ? canManageAgents(user.role) : false;

  const agentTools = tools.filter((t) => agent.tools.includes(t.name));
  const agentMemory = memory.filter((m) => m.source === agent.name).slice(0, 8);
  const agentGuardrailEvents = guardrailEvents.filter((g) => g.agentName === agent.name).slice(0, 8);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">{agent.name}</h1>
            <Badge variant={agent.environment === "production" ? "accent" : "default"}>{agent.environment}</Badge>
            <StatusBadge status={agent.status} />
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-dim">{agent.description}</p>
        </div>
        {canManage ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm">
            <Play size={13} /> Run
          </Button>
          <AgentActionButtons agentId={agent.id} status={agent.status} />
        </div>
        ) : (
          <Badge>view only</Badge>
        )}
      </div>

      {canManage && (
        <div className="mb-4">
          <RunAgentPanel agentId={agent.id} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Runs" value={formatNumber(agent.runs)} icon={undefined} />
        <MetricCard label="Success Rate" value={`${agent.successRate}%`} />
        <MetricCard label="Latency" value={formatMs(agent.avgLatencyMs)} />
        <MetricCard label="Tokens" value={formatNumber(agent.tokens)} />
        <MetricCard label="Cost" value={formatCost(agent.costUsd)} />
      </div>

      <Tabs
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Panel className="p-4 lg:col-span-2">
                  <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Instructions</span>
                  <p className="whitespace-pre-wrap rounded bg-panel-2 p-3 font-mono-data text-[12.5px] leading-relaxed text-ink-dim">{agent.instructions}</p>

                  <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Tools</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t) => (
                      <Badge key={t}><Mono>{t}</Mono></Badge>
                    ))}
                    {agent.tools.length === 0 && <span className="text-sm text-ink-faint">No tools attached.</span>}
                  </div>

                  {agent.handoffs.length > 0 && (
                    <>
                      <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Handoffs</span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.handoffs.map((h) => (
                          <Badge key={h} variant="accent"><Mono>{h}</Mono></Badge>
                        ))}
                      </div>
                    </>
                  )}

                  <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Guardrails</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.guardrails.map((g) => (
                      <Badge key={g}>{g}</Badge>
                    ))}
                  </div>
                </Panel>

                <Panel className="p-4">
                  <span className="mb-3 block text-2xs uppercase tracking-wide text-ink-faint">Configuration</span>
                  <dl className="space-y-2.5 text-[13px]">
                    <Row label="Provider" value={agent.provider} />
                    <Row label="Model" value={<Mono>{agent.model}</Mono>} />
                    <Row label="Temperature" value={agent.temperature.toString()} />
                    <Row label="Max tokens" value={formatNumber(agent.maxTokens)} />
                    <Row label="Memory" value={agent.memory} />
                    <Row label="Version" value={<Mono>{agent.version}</Mono>} />
                    <Row label="Created" value={timeAgo(agent.createdAt)} />
                  </dl>
                </Panel>
              </div>
            ),
          },
          {
            key: "runs",
            label: "Runs",
            content: (
              <Table>
                <thead>
                  <tr>
                    <Th>Run ID</Th>
                    <Th>Status</Th>
                    <Th>Duration</Th>
                    <Th>Tokens</Th>
                    <Th>Cost</Th>
                    <Th>Started</Th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <ClickableRow key={r.id} href={`/runs/${r.id}`}>
                      <Td><Mono>{r.id}</Mono></Td>
                      <Td><StatusBadge status={r.status} /></Td>
                      <Td>{formatMs(r.durationMs)}</Td>
                      <Td>{formatNumber(r.tokens)}</Td>
                      <Td>{formatCost(r.costUsd)}</Td>
                      <Td className="text-ink-dim">{timeAgo(r.startedAt)}</Td>
                    </ClickableRow>
                  ))}
                </tbody>
              </Table>
            ),
          },
          {
            key: "tools",
            label: "Tools",
            content: (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agentTools.map((t) => (
                  <Link key={t.id} href={`/tools/${t.id}`}>
                    <Panel className="p-3.5 hover:border-ink-faint">
                      <div className="flex items-center justify-between">
                        <Mono className="font-medium text-ink">{t.name}</Mono>
                        <Badge>{t.type}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-dim">{t.description}</p>
                      <div className="mt-2.5 flex items-center gap-3 text-2xs text-ink-faint">
                        <span>{formatNumber(t.calls)} calls</span>
                        <span>{t.successRate}% success</span>
                      </div>
                    </Panel>
                  </Link>
                ))}
              </div>
            ),
          },
          {
            key: "memory",
            label: "Memory",
            content: (
              <div className="space-y-2">
                {agentMemory.length === 0 && <p className="text-sm text-ink-faint">No memory records linked to this agent yet.</p>}
                {agentMemory.map((m) => (
                  <Panel key={m.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge>{m.type}</Badge>
                        <Mono className="text-2xs text-ink-faint">{m.id}</Mono>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-ink">{m.content}</p>
                    </div>
                    <span className="shrink-0 text-2xs text-ink-faint">{Math.round(m.confidence * 100)}% confidence</span>
                  </Panel>
                ))}
              </div>
            ),
          },
          {
            key: "guardrails",
            label: "Guardrails",
            content: (
              <div className="space-y-2">
                {agentGuardrailEvents.length === 0 && <p className="text-sm text-ink-faint">No guardrail events recorded for this agent recently.</p>}
                {agentGuardrailEvents.map((g) => (
                  <Panel key={g.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <StatusDot status={g.action} />
                      <div>
                        <div className="text-[13px] text-ink">{g.guardrail}</div>
                        <div className="text-2xs text-ink-faint">{g.reason}</div>
                      </div>
                    </div>
                    <span className="text-2xs text-ink-faint">{timeAgo(g.timestamp)}</span>
                  </Panel>
                ))}
              </div>
            ),
          },
          {
            key: "versions",
            label: "Versions",
            content: (
              <div className="space-y-2">
                {[agent.version, "v" + (parseInt(agent.version.slice(1)) - 1 || 1), "v" + Math.max(1, parseInt(agent.version.slice(1)) - 2)].map((v, i) => (
                  <Panel key={v} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Mono className="text-ink">{v}</Mono>
                      {i === 0 && <Badge variant="accent">current</Badge>}
                    </div>
                    <span className="text-2xs text-ink-faint">{timeAgo(new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 12).toISOString())}</span>
                  </Panel>
                ))}
              </div>
            ),
          },
          {
            key: "configuration",
            label: "Configuration",
            content: (
              <Panel className="p-4">
                <pre className="overflow-x-auto font-mono-data text-[12.5px] leading-relaxed text-ink-dim">
{JSON.stringify(
  {
    name: agent.name,
    model: agent.model,
    provider: agent.provider,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    tools: agent.tools,
    handoffs: agent.handoffs,
    memory: agent.memory,
    guardrails: agent.guardrails,
  },
  null,
  2
)}
                </pre>
              </Panel>
            ),
          },
        ]}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="capitalize text-ink">{value}</dd>
    </div>
  );
}
