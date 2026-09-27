import { PageHeader } from "@/components/ui/primitives";
import { AgentBuilder } from "@/components/agents/agent-builder";

export default function NewAgentPage() {
  return (
    <div>
      <PageHeader title="Create Agent" subtitle="Bundle instructions, model, tools, and guardrails into one deployable agent." />
      <AgentBuilder />
    </div>
  );
}
