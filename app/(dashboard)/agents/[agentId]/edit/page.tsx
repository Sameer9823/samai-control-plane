import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { SamAIClient } from "@/lib/samai/client";
import { AgentBuilder } from "@/components/agents/agent-builder";

export default async function EditAgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = await SamAIClient.getAgent(agentId);
  if (!agent) notFound();

  return (
    <div>
      <PageHeader title="Edit Agent" subtitle="Update this agent's configuration. A new version is created on save — history is preserved." />
      <AgentBuilder mode="edit" agentId={agentId} initialData={agent} />
    </div>
  );
}
