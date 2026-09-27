import { notFound } from "next/navigation";
import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Panel, Badge, Mono, StatusBadge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export default async function MCPDetailPage({ params }: { params: Promise<{ mcpId: string }> }) {
  const { mcpId } = await params;
  const server = await SamAIClient.getMCPServer(mcpId);
  if (!server) notFound();

  return (
    <div>
      <PageHeader title={server.name} subtitle={`${server.transport} transport — ${server.endpoint}`} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="p-4">
          <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Health</span>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-dim">Status</span>
            <StatusBadge status={server.status} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-ink-dim">Last used</span>
            <span className="text-ink">{timeAgo(server.lastUsed)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-ink-dim">Transport</span>
            <Badge>{server.transport}</Badge>
          </div>
        </Panel>

        <Panel className="p-4">
          <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Tools</span>
          <div className="flex flex-wrap gap-1.5">
            {server.tools.map((t) => (
              <Badge key={t}><Mono>{t}</Mono></Badge>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <span className="mb-2 block text-2xs uppercase tracking-wide text-ink-faint">Agents</span>
          <div className="flex flex-wrap gap-1.5">
            {server.agents.map((a) => (
              <Badge key={a}>{a}</Badge>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
