import Link from "next/link";
import { PageHeader, Button, Panel, StatusBadge, Badge, Mono } from "@/components/ui/primitives";
import { SamAIClient } from "@/lib/samai/client";
import { timeAgo } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function MCPPage() {
  const servers = await SamAIClient.listMCPServers();
  return (
    <div>
      <PageHeader
        title="MCP"
        subtitle="Connect AI agents to external tool ecosystems."
        actions={
          <Button>
            <Plus size={14} /> Add MCP Server
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {servers.map((s) => (
          <Link key={s.id} href={`/mcp/${s.id}`}>
            <Panel className="p-4 hover:border-ink-faint">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">{s.name}</span>
                <StatusBadge status={s.status} />
              </div>
              <Mono className="mt-1 block truncate text-2xs text-ink-faint">{s.endpoint}</Mono>
              <div className="mt-3 flex items-center gap-4 text-2xs text-ink-dim">
                <span>{s.tools.length} tools</span>
                <span>{s.agents.length} agents</span>
                <Badge>{s.transport}</Badge>
              </div>
              <div className="mt-2 text-2xs text-ink-faint">Last used {timeAgo(s.lastUsed)}</div>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
