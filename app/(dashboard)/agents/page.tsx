import { PageHeader, Button, Table, Th, Td, Tr, StatusBadge, Mono, Badge } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { SamAIClient } from "@/lib/samai/client";
import { formatMs, formatNumber, timeAgo } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAgents } from "@/lib/auth/rbac";
import { Plus } from "lucide-react";

export default async function AgentsPage() {
  const [agents, user] = await Promise.all([SamAIClient.listAgents(), getCurrentUser()]);
  const canManage = user ? canManageAgents(user.role) : false;

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Every agent built with SamAI SDK, across every environment."
        actions={
          canManage ? (
            <Button href="/agents/new">
              <Plus size={14} /> Create Agent
            </Button>
          ) : undefined
        }
      />

      <Table>
        <thead>
          <tr>
            <Th>Agent</Th>
            <Th>Environment</Th>
            <Th>Model</Th>
            <Th>Runs</Th>
            <Th>Success Rate</Th>
            <Th>Latency</Th>
            <Th>Status</Th>
            <Th>Last Active</Th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <ClickableRow key={a.id} href={`/agents/${a.id}`}>
              <Td className="font-medium">{a.name}</Td>
              <Td>
                <Badge variant={a.environment === "production" ? "accent" : "default"}>{a.environment}</Badge>
              </Td>
              <Td>
                <Mono className="text-ink-dim">{a.model}</Mono>
              </Td>
              <Td>{formatNumber(a.runs)}</Td>
              <Td>{a.successRate}%</Td>
              <Td>{formatMs(a.avgLatencyMs)}</Td>
              <Td>
                <StatusBadge status={a.status} />
              </Td>
              <Td className="text-ink-dim">{timeAgo(a.lastActive)}</Td>
            </ClickableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
