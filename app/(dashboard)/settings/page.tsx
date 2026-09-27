import { PageHeader, Panel, Button, Badge, Mono, StatusBadge } from "@/components/ui/primitives";
import { Plus, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/rbac";

const API_KEYS = [
  { name: "Production server key", prefix: "sk_live_8f2a…", created: "2026-08-01", lastUsed: "2 min ago" },
  { name: "CI pipeline key", prefix: "sk_live_c910…", created: "2026-07-14", lastUsed: "1h ago" },
  { name: "Local dev key", prefix: "sk_test_44b1…", created: "2026-09-02", lastUsed: "3d ago" },
];

const TEAM = [
  { name: "Sameer", role: "Owner", email: "owner@acme.ai" },
  { name: "Priya", role: "Admin", email: "admin@acme.ai" },
  { name: "Dev", role: "Developer", email: "dev@acme.ai" },
  { name: "Viewer", role: "Viewer", email: "viewer@acme.ai" },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const canManage = user ? canManageSettings(user.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Workspace, API keys, team, environments, and integrations." />

      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">API Keys</span>
          {canManage ? (
            <Button size="sm">
              <Plus size={13} /> Create Key
            </Button>
          ) : (
            <Badge><Lock size={10} className="mr-1" />Admin only</Badge>
          )}
        </div>
        <div className="space-y-2">
          {API_KEYS.map((k) => (
            <div key={k.prefix} className="flex items-center justify-between rounded border border-border bg-panel-2 px-3 py-2">
              <div>
                <div className="text-[13px] text-ink">{k.name}</div>
                <Mono className="text-2xs text-ink-faint">{k.prefix}</Mono>
              </div>
              <div className="flex items-center gap-3 text-2xs text-ink-faint">
                <span>Created {k.created}</span>
                <span>Used {k.lastUsed}</span>
                {canManage && (
                  <>
                    <Button size="sm" variant="outline">Rotate</Button>
                    <Button size="sm" variant="danger">Revoke</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-2xs text-ink-faint">Full key values are shown once at creation and never displayed again.</p>
      </Panel>

      <Panel className="p-4">
        <span className="mb-3 block text-[13px] font-medium text-ink">Team</span>
        <div className="space-y-2">
          {TEAM.map((m) => (
            <div key={m.email} className="flex items-center justify-between text-[13px]">
              <div>
                <span className="text-ink">{m.name}</span>
                <span className="ml-2 text-2xs text-ink-faint">{m.email}</span>
              </div>
              <Badge>{m.role}</Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <span className="mb-3 block text-[13px] font-medium text-ink">Environments</span>
        <div className="flex gap-2">
          {[
            { name: "Development", status: "active" },
            { name: "Staging", status: "active" },
            { name: "Production", status: "active" },
          ].map((e) => (
            <div key={e.name} className="flex items-center gap-2 rounded border border-border-strong bg-panel-2 px-3 py-1.5 text-[13px] text-ink">
              {e.name}
              <StatusBadge status={e.status} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <span className="mb-3 block text-[13px] font-medium text-ink">Integrations</span>
        <p className="text-xs text-ink-dim">Manage connected MCP servers from the <Mono className="text-xs">/mcp</Mono> page. Webhooks and audit log export are configured here in a production deployment.</p>
      </Panel>
    </div>
  );
}
