import { runAgentStream, AgentRunError } from "samai-sdk";
import { SamAIClient, buildRuntimeClient, buildRunSummary, persistCompletedRun } from "@/lib/samai/client";
import { toSamaiAgent } from "@/lib/samai/agent-builder";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAgents } from "@/lib/auth/rbac";

export const runtime = "nodejs";

/**
 * POST /api/agents/[agentId]/run
 * ---------------------------------------------------------------------------
 * Body: { input: string }
 * Response: newline-delimited JSON (NDJSON), one line per samai-sdk
 * `AgentEvent` as the real agent loop (`runAgentStream()`) produces it —
 * this is the "Live Run Stream" from product brief section 16 — followed by
 * a final `{ kind: "done", runId }` line once the run (and its persistence)
 * is complete. See components/agents/run-agent-panel.tsx for the client
 * side that reads this stream.
 */
export async function POST(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const user = await getCurrentUser();
  if (!user || !canManageAgents(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const input = body?.input;
  if (typeof input !== "string" || !input.trim()) {
    return Response.json({ error: "Missing 'input' string in request body" }, { status: 400 });
  }

  const agentSummary = await SamAIClient.getAgent(agentId);
  if (!agentSummary) {
    return Response.json({ error: `Agent ${agentId} not found` }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const agent = toSamaiAgent(agentSummary);
      const client = buildRuntimeClient(agent, input);

      try {
        const gen = runAgentStream(client, agent, input, {
          // See the matching comment in lib/samai/client.ts#triggerRun —
          // approval-gated tools fail closed rather than auto-approving.
          onApprovalRequest: async () => false,
        });
        let next = await gen.next();
        while (!next.done) {
          send({ kind: "event", event: next.value });
          next = await gen.next();
        }
        const result = next.value;
        const runSummary = buildRunSummary(agentSummary, input, result.trace, "success", result.text);
        await persistCompletedRun(agentSummary, runSummary);
        send({ kind: "done", runId: result.trace.runId });
      } catch (err) {
        if (err instanceof AgentRunError) {
          const runSummary = buildRunSummary(agentSummary, input, err.trace, "failed");
          await persistCompletedRun(agentSummary, runSummary);
          send({ kind: "done", runId: err.trace.runId, error: err.message });
        } else {
          send({ kind: "error", error: err instanceof Error ? err.message : String(err) });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
