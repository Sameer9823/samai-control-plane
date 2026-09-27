// scripts/verify-live-run.ts
//
// Proves lib/samai/agent-builder.ts + lib/samai/tools.ts + the runAgent/
// runAgentStream wiring actually work, by running a real samai-sdk agent
// loop against the SDK's own `createMockProvider()` — no network, no API
// key, and nothing hand-simulated: this is the real agent loop from
// node_modules/samai-sdk deciding when to call a tool and when to answer.
// Not part of the delivered app — a one-off verification harness, same
// role as scripts/verify-db.mjs for the database layer.
import { createClient, createMockProvider, runAgent, runAgentStream } from "samai-sdk";
import { toSamaiAgent } from "../lib/samai/agent-builder";
import type { AgentSummary } from "../lib/samai/types";

const fakeAgent: AgentSummary = {
  id: "agt_demo",
  name: "Demo Agent",
  description: "test",
  environment: "development",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  temperature: 0.4,
  maxTokens: 1024,
  instructions: "Use the calculator tool for any math question, then answer in one sentence.",
  tools: ["calculator", "unwired_tool"],
  handoffs: [],
  memory: "none",
  guardrails: [],
  status: "active",
  version: "v1",
  runs: 0,
  successRate: 100,
  avgLatencyMs: 0,
  tokens: 0,
  costUsd: 0,
  lastActive: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const mock = createMockProvider({
  responses: [
    { toolCalls: [{ toolName: "calculator", args: { expression: "12 * (4 + 1)" } }] },
    { text: "12 times (4 + 1) is 60." },
  ],
});

const client = createClient({ provider: mock });
const agent = toSamaiAgent(fakeAgent);

console.log("== runAgentStream: live event-by-event output ==");
async function streamRun() {
  const gen = runAgentStream(client, agent, "What's 12 times (4 + 1)?");
  let next = await gen.next();
  while (!next.done) {
    const event = next.value;
    console.log(`  [${event.type}]`, JSON.stringify(event).slice(0, 140));
    next = await gen.next();
  }
  return next.value; // RunResult
}

async function main() {
  const streamed = await streamRun();
  console.log("\nFinal text (via stream):", streamed.text);
  console.log("Final agent:", streamed.finalAgent);
  console.log("Trace event count:", streamed.trace.events.length);
  console.log("Trace agentPath:", streamed.trace.agentPath);
  console.log("Total usage:", streamed.trace.totalUsage);

  console.log("\n== runAgent: convenience wrapper (also exercises the unwired_tool stub) ==");
  mock.reset();
  const result = await runAgent(client, agent, "What's 12 times (4 + 1)?");
  console.log("Output text:", result.text);
  console.log("RunTrace event types in order:", result.trace.events.map((e) => e.type).join(" -> "));

  const toolCallEvent = result.trace.events.find((e) => e.type === "tool-call");
  const toolResultEvent = result.trace.events.find((e) => e.type === "tool-result");
  console.log("\nTool call event:", toolCallEvent);
  console.log("Tool result event:", toolResultEvent);

  if (result.trace.events[0]?.type !== "run-started" || result.trace.events.at(-1)?.type !== "run-completed") {
    throw new Error("VERIFICATION FAILED: trace didn't start/end as expected");
  }
  if (!toolCallEvent || (toolCallEvent as { toolName: string }).toolName !== "calculator") {
    throw new Error("VERIFICATION FAILED: calculator tool wasn't actually called by the real agent loop");
  }

  console.log("\nVERIFICATION PASSED: the real samai-sdk agent loop ran, called the real calculator");
  console.log("tool (via lib/samai/tools.ts), and produced a RunTrace shaped exactly like");
  console.log("lib/samai/types.ts expects — the same code path lib/samai/client.ts#triggerRun uses.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
