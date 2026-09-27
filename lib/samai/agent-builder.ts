import { defineAgent, type Agent } from "samai-sdk";
import { resolveTools } from "./tools";
import type { AgentSummary } from "./types";

/**
 * lib/samai/agent-builder.ts
 * ---------------------------------------------------------------------------
 * Turns the Control Plane's own `AgentSummary` (whichever agent the person
 * picked in the UI, backed by Postgres or demo-data) into a real
 * `samai-sdk` `Agent` via `defineAgent()` — the exact same function you'd
 * call by hand when building an agent directly against the SDK.
 *
 * Scope for this build: single-agent runs only — handoffs aren't resolved
 * into a real `Agent<any>[]` tree here (that means e.g. Research Agent's
 * configured handoff to `writer_agent` won't actually execute a handoff in
 * a live run, even though it's shown as a static handoff badge on the
 * agent's Overview tab). Wiring that up means resolving `AgentSummary.handoffs`
 * (names) to other `AgentSummary` rows and recursively calling this same
 * function for each — a natural next step, not implemented here.
 */
export function toSamaiAgent(agent: AgentSummary): Agent {
  return defineAgent({
    name: agent.name,
    instructions: agent.instructions,
    model: agent.model,
    tools: resolveTools(agent.tools),
    maxTurns: 8,
  });
}
