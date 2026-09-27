import { PageHeader, Button, Table, Th, Td, StatusBadge, Mono, Badge } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { SamAIClient } from "@/lib/samai/client";
import { formatMs, formatNumber } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function ToolsPage() {
  const tools = await SamAIClient.listTools();

  return (
    <div>
      <PageHeader
        title="Tools"
        subtitle="Every tool registered across your agents, with live call volume and success rate."
        actions={
          <Button href="#">
            <Plus size={14} /> Create Tool
          </Button>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Tool</Th>
            <Th>Type</Th>
            <Th>Agents</Th>
            <Th>Calls</Th>
            <Th>Success</Th>
            <Th>Latency</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {tools.map((t) => (
            <ClickableRow key={t.id} href={`/tools/${t.id}`}>
              <Td>
                <div className="flex items-center gap-2">
                  <Mono className="font-medium text-ink">{t.name}</Mono>
                  {t.requiresApproval && <Badge>approval-gated</Badge>}
                </div>
              </Td>
              <Td><Badge>{t.type}</Badge></Td>
              <Td className="text-ink-dim">{t.agents.length} agents</Td>
              <Td>{formatNumber(t.calls)}</Td>
              <Td>{t.successRate}%</Td>
              <Td>{formatMs(t.avgLatencyMs)}</Td>
              <Td><StatusBadge status={t.status} /></Td>
            </ClickableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
