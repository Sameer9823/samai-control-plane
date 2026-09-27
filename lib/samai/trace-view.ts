import type { RunTrace, TraceEvent, Usage } from "./types";

export type TraceNodeKind =
  | "start"
  | "model"
  | "tool"
  | "handoff"
  | "guardrail"
  | "approval"
  | "retry"
  | "fallback"
  | "timeout"
  | "final"
  | "failed";

export interface TraceNode {
  id: string;
  kind: TraceNodeKind;
  agentName: string;
  title: string;
  subtitle?: string;
  timestamp: number;
  durationMs?: number;
  detail: Record<string, string | number | boolean | undefined>;
  raw: TraceEvent[];
}

function estimateCost(usage: Usage, model: string): number {
  // Rough blended per-1K-token estimate for demo display only.
  const rate = model.includes("haiku") || model.includes("mini") || model.includes("flash") ? 0.0003 : 0.0025;
  return (usage.totalTokens / 1000) * rate;
}

/**
 * Converts a `RunTrace.events` log (the exact shape `runAgent()` produces)
 * into display nodes for the timeline — pairing `model-call` with its
 * `model-call-completed`, and `tool-call` with its `tool-result`, the way
 * the Run Detail + Trace UI (spec section 15) expects.
 */
export function toTraceNodes(trace: RunTrace): TraceNode[] {
  const nodes: TraceNode[] = [];
  const events = trace.events;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    switch (e.type) {
      case "run-started":
        nodes.push({
          id: `n${i}`,
          kind: "start",
          agentName: e.agentName,
          title: "User Request",
          subtitle: `Started by ${e.agentName}`,
          timestamp: e.timestamp,
          detail: { Agent: e.agentName },
          raw: [e],
        });
        break;
      case "model-call": {
        const completed = events[i + 1]?.type === "model-call-completed" ? events[i + 1] : undefined;
        const usage = completed && completed.type === "model-call-completed" ? completed.usage : undefined;
        nodes.push({
          id: `n${i}`,
          kind: "model",
          agentName: e.agentName,
          title: "Model Call",
          subtitle: e.model,
          timestamp: e.timestamp,
          durationMs: completed ? completed.timestamp - e.timestamp : undefined,
          detail: {
            Agent: e.agentName,
            Model: e.model,
            Turn: e.turn,
            "Input tokens": usage?.inputTokens,
            "Output tokens": usage?.outputTokens,
            "Cache read tokens": usage?.cacheReadTokens,
            "Cache write tokens": usage?.cacheWriteTokens,
            "Est. cost": usage ? `$${estimateCost(usage, e.model).toFixed(4)}` : undefined,
            "Latency": completed ? `${completed.timestamp - e.timestamp}ms` : undefined,
          },
          raw: completed ? [e, completed] : [e],
        });
        if (completed) i++;
        break;
      }
      case "tool-call": {
        const result = events[i + 1]?.type === "tool-result" ? events[i + 1] : undefined;
        nodes.push({
          id: `n${i}`,
          kind: "tool",
          agentName: e.agentName,
          title: "Tool Call",
          subtitle: e.toolName,
          timestamp: e.timestamp,
          durationMs: result && result.type === "tool-result" ? result.durationMs : undefined,
          detail: {
            Agent: e.agentName,
            Tool: e.toolName,
            Arguments: JSON.stringify(e.args),
            Status: result && result.type === "tool-result" ? (result.isError ? "Error" : "Success") : "Pending",
            Duration: result && result.type === "tool-result" && result.durationMs ? `${result.durationMs}ms` : undefined,
          },
          raw: result ? [e, result] : [e],
        });
        if (result) i++;
        break;
      }
      case "handoff":
        nodes.push({
          id: `n${i}`,
          kind: "handoff",
          agentName: e.toAgent,
          title: "Agent Handoff",
          subtitle: `${e.fromAgent} → ${e.toAgent}`,
          timestamp: e.timestamp,
          detail: { "Source agent": e.fromAgent, "Target agent": e.toAgent, Reason: e.reason ?? "—" },
          raw: [e],
        });
        break;
      case "guardrail-triggered":
        nodes.push({
          id: `n${i}`,
          kind: "guardrail",
          agentName: e.agentName,
          title: "Guardrail",
          subtitle: e.guardrailName ?? e.stage,
          timestamp: e.timestamp,
          detail: { Guardrail: e.guardrailName ?? "custom", Stage: e.stage, Action: e.action ?? "blocked", Reason: e.reason },
          raw: [e],
        });
        break;
      case "approval-requested": {
        const resolved = events[i + 1]?.type === "approval-resolved" ? events[i + 1] : undefined;
        nodes.push({
          id: `n${i}`,
          kind: "approval",
          agentName: e.agentName,
          title: "Approval Required",
          subtitle: e.toolName,
          timestamp: e.timestamp,
          detail: {
            Agent: e.agentName,
            Tool: e.toolName,
            Arguments: e.args ? JSON.stringify(e.args) : undefined,
            Status: resolved && resolved.type === "approval-resolved" ? (resolved.approved ? "Approved" : "Rejected") : "Pending",
          },
          raw: resolved ? [e, resolved] : [e],
        });
        if (resolved) i++;
        break;
      }
      case "retry":
        nodes.push({
          id: `n${i}`,
          kind: "retry",
          agentName: e.agentName,
          title: "Retry",
          subtitle: `attempt ${e.attempt}`,
          timestamp: e.timestamp,
          detail: { Agent: e.agentName, Attempt: e.attempt, "Delay": `${e.delayMs}ms`, Error: e.error },
          raw: [e],
        });
        break;
      case "fallback":
        nodes.push({
          id: `n${i}`,
          kind: "fallback",
          agentName: e.agentName,
          title: "Fallback",
          subtitle: `${e.failedProvider} → ${e.nextProvider}`,
          timestamp: e.timestamp,
          detail: { "Failed provider": e.failedProvider, "Next provider": e.nextProvider, Error: e.error },
          raw: [e],
        });
        break;
      case "timeout":
        nodes.push({
          id: `n${i}`,
          kind: "timeout",
          agentName: e.agentName,
          title: "Timeout",
          subtitle: e.model,
          timestamp: e.timestamp,
          detail: { Agent: e.agentName, Model: e.model, "Timeout": `${e.timeoutMs}ms` },
          raw: [e],
        });
        break;
      case "run-completed":
        nodes.push({
          id: `n${i}`,
          kind: "final",
          agentName: trace.agentPath[trace.agentPath.length - 1] ?? "",
          title: "Final Response",
          timestamp: e.timestamp,
          detail: { "Total tokens": trace.totalUsage.totalTokens },
          raw: [e],
        });
        break;
      case "run-failed":
        nodes.push({
          id: `n${i}`,
          kind: "failed",
          agentName: trace.agentPath[trace.agentPath.length - 1] ?? "",
          title: "Run Failed",
          timestamp: e.timestamp,
          detail: { Error: e.error },
          raw: [e],
        });
        break;
    }
  }
  return nodes;
}
