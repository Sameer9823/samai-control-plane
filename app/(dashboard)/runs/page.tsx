import { PageHeader, Table, Th, Td, StatusBadge, Mono, Badge } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { SamAIClient } from "@/lib/samai/client";
import { formatCost, formatMs, formatNumber, timeAgo } from "@/lib/utils";

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ status?: string; agent?: string }> }) {
  const { status, agent } = await searchParams;
  const [allRuns, agents] = await Promise.all([SamAIClient.listRuns(), SamAIClient.listAgents()]);

  const runs = allRuns.filter((r) => (status ? r.status === status : true) && (agent ? r.agentId === agent : true));
  const statuses = ["success", "running", "failed", "waiting_approval", "cancelled"];

  return (
    <div>
      <PageHeader title="Runs" subtitle={`${formatNumber(allRuns.length)} runs across all agents and environments.`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink label="All statuses" href="/runs" active={!status} />
        {statuses.map((s) => (
          <FilterLink key={s} label={s.replace("_", " ")} href={`/runs?status=${s}`} active={status === s} />
        ))}
        <span className="mx-1 h-4 w-px bg-border-strong" />
        <FilterLink label="All agents" href="/runs" active={!agent} />
        {agents.map((a) => (
          <FilterLink key={a.id} label={a.name} href={`/runs?agent=${a.id}`} active={agent === a.id} />
        ))}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Run ID</Th>
            <Th>Agent</Th>
            <Th>Status</Th>
            <Th>Duration</Th>
            <Th>Tokens</Th>
            <Th>Cost</Th>
            <Th>Started</Th>
          </tr>
        </thead>
        <tbody>
          {runs.slice(0, 60).map((r) => (
            <ClickableRow key={r.id} href={`/runs/${r.id}`}>
              <Td><Mono>{r.id}</Mono></Td>
              <Td>
                <div className="flex items-center gap-2">
                  {r.agentName}
                  <Badge variant={r.environment === "production" ? "accent" : "default"}>{r.environment}</Badge>
                </div>
              </Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>{formatMs(r.durationMs)}</Td>
              <Td>{formatNumber(r.tokens)}</Td>
              <Td>{formatCost(r.costUsd)}</Td>
              <Td className="text-ink-dim">{timeAgo(r.startedAt)}</Td>
            </ClickableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`rounded-full border px-2.5 py-1 text-2xs capitalize transition-colors ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim hover:text-ink"
      }`}
    >
      {label}
    </a>
  );
}
