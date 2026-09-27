import { notFound } from "next/navigation";
import Link from "next/link";
import { SamAIClient } from "@/lib/samai/client";
import { PageHeader, Panel, Badge, Mono } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export default async function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const sessions = await SamAIClient.listSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) notFound();

  const runs = (await SamAIClient.listRuns()).filter((r) => r.agentName === session.agentName).slice(0, 4);

  return (
    <div>
      <PageHeader title={session.id} subtitle={`${session.agentName} · ${session.store}`} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <span className="mb-3 block text-2xs uppercase tracking-wide text-ink-faint">Conversation</span>
          <div className="space-y-3">
            <div className="rounded bg-panel-2 p-3 text-[13px] text-ink">
              <span className="mb-1 block text-2xs text-ink-faint">user</span>
              {runs[0]?.input ?? "How do I get started?"}
            </div>
            <div className="rounded border border-accent/20 bg-accent/5 p-3 text-[13px] text-ink">
              <span className="mb-1 block text-2xs text-accent">{session.agentName}</span>
              {runs[0]?.output ?? "Here's how to get started…"}
            </div>
          </div>

          <span className="mb-2 mt-5 block text-2xs uppercase tracking-wide text-ink-faint">Trace links</span>
          <div className="space-y-1">
            {runs.map((r) => (
              <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center justify-between rounded px-2 py-1.5 text-[13px] hover:bg-panel-2">
                <Mono className="text-ink-dim">{r.id}</Mono>
                <span className="text-2xs text-ink-faint">{timeAgo(r.startedAt)}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <span className="mb-3 block text-2xs uppercase tracking-wide text-ink-faint">Details</span>
          <dl className="space-y-2.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-ink-faint">User</dt><dd className="text-ink">{session.userId}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-faint">Agent</dt><dd className="text-ink">{session.agentName}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-faint">Messages</dt><dd className="text-ink">{session.messages}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-faint">Store</dt><dd><Badge>{session.store}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-ink-faint">Last active</dt><dd className="text-ink">{timeAgo(session.lastActive)}</dd></div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
