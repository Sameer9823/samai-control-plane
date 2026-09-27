import { PageHeader, Table, Th, Td, Badge, Mono } from "@/components/ui/primitives";
import { ClickableRow } from "@/components/ui/clickable-row";
import { SamAIClient } from "@/lib/samai/client";
import { timeAgo } from "@/lib/utils";

export default async function SessionsPage() {
  const sessions = await SamAIClient.listSessions();
  return (
    <div>
      <PageHeader title="Sessions" subtitle="Cross-run conversation memory, backed by the samai-sdk SessionStore of your choice." />
      <Table>
        <thead>
          <tr>
            <Th>Session ID</Th>
            <Th>User</Th>
            <Th>Agent</Th>
            <Th>Messages</Th>
            <Th>Store</Th>
            <Th>Last Active</Th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <ClickableRow key={s.id} href={`/sessions/${s.id}`}>
              <Td><Mono>{s.id}</Mono></Td>
              <Td className="text-ink-dim">{s.userId}</Td>
              <Td>{s.agentName}</Td>
              <Td>{s.messages}</Td>
              <Td><Badge>{s.store}</Badge></Td>
              <Td className="text-ink-dim">{timeAgo(s.lastActive)}</Td>
            </ClickableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
