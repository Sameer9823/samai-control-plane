import { makeRng } from "./rng";
import type {
  AgentSummary,
  ApprovalRequest,
  EvaluationSummary,
  GuardrailEvent,
  MCPServerSummary,
  MemoryRecord,
  ModelProviderSummary,
  RunSummary,
  RunTrace,
  SessionSummary,
  ToolSummary,
  TraceEvent,
  Usage,
} from "./types";

const rng = makeRng(20260922);

const now = Date.now();
const isoAgo = (ms: number) => new Date(now - ms).toISOString();

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const AGENTS: AgentSummary[] = [
  {
    id: "agt_research",
    name: "Research Agent",
    description: "Answers open-ended research questions by searching the web and handing off to Writer Agent for the final synthesis.",
    environment: "production",
    provider: "openai",
    model: "gpt-4.1",
    temperature: 0.4,
    maxTokens: 4096,
    instructions:
      "Answer questions using web_search for anything time-sensitive or after your training cutoff. When you have enough material, hand off to writer_agent for the final synthesized response. Always cite sources.",
    tools: ["web_search", "database_query"],
    handoffs: ["writer_agent"],
    memory: "hybrid",
    guardrails: ["Citation Required", "Prompt Injection"],
    status: "active",
    version: "v14",
    runs: 8421,
    successRate: 99.1,
    avgLatencyMs: 1800,
    tokens: 6_820_000,
    costUsd: 61.4,
    lastActive: isoAgo(2 * 60 * 1000),
    createdAt: isoAgo(1000 * 60 * 60 * 24 * 96),
  },
  {
    id: "agt_coding",
    name: "Coding Agent",
    description: "Reviews and edits code in connected repositories — reads files, runs tests, and proposes diffs for human approval.",
    environment: "production",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    temperature: 0.2,
    maxTokens: 8192,
    instructions:
      "Review the requested code paths using read_file and search_code, run run_tests to verify behavior, and summarize findings. Never call git_diff-based writes or deploy actions without explicit approval.",
    tools: ["read_file", "write_file", "search_code", "run_tests", "git_diff", "deploy_production"],
    handoffs: [],
    memory: "session",
    guardrails: ["Dangerous Tool", "Budget"],
    status: "active",
    version: "v9",
    runs: 4823,
    successRate: 97.8,
    avgLatencyMs: 3100,
    tokens: 9_140_000,
    costUsd: 88.2,
    lastActive: isoAgo(8 * 60 * 1000),
    createdAt: isoAgo(1000 * 60 * 60 * 24 * 71),
  },
  {
    id: "agt_support",
    name: "Support Agent",
    description: "Customer-facing support assistant grounded in the product knowledge base, with PII redaction on every turn.",
    environment: "production",
    provider: "google",
    model: "gemini-2.5-pro",
    temperature: 0.3,
    maxTokens: 2048,
    instructions:
      "Use retrieve_knowledge to ground every answer in the support docs before replying. Never ask for or repeat full card numbers, SSNs, or passwords. Escalate refunds over $100 to approval.",
    tools: ["database_query", "http_request"],
    handoffs: [],
    memory: "vector",
    guardrails: ["PII Detection", "Budget"],
    status: "active",
    version: "v22",
    runs: 2109,
    successRate: 98.9,
    avgLatencyMs: 1400,
    tokens: 2_310_000,
    costUsd: 14.6,
    lastActive: isoAgo(45 * 1000),
    createdAt: isoAgo(1000 * 60 * 60 * 24 * 140),
  },
  {
    id: "agt_sales",
    name: "Sales Agent",
    description: "Drafts outbound sequences and enriches lead records from CRM + web data. Currently staged for a prompt revision.",
    environment: "staging",
    provider: "mistral",
    model: "mistral-large-latest",
    temperature: 0.6,
    maxTokens: 3072,
    instructions: "Draft short, specific outbound emails referencing the lead's recent activity. Never fabricate company facts — look them up with web_search first.",
    tools: ["web_search", "database_query"],
    handoffs: [],
    memory: "session",
    guardrails: ["Budget"],
    status: "paused",
    version: "v3",
    runs: 612,
    successRate: 95.4,
    avgLatencyMs: 2200,
    tokens: 480_000,
    costUsd: 5.1,
    lastActive: isoAgo(1000 * 60 * 60 * 26),
    createdAt: isoAgo(1000 * 60 * 60 * 24 * 18),
  },
];

export const WRITER_AGENT_NAME = "writer_agent";

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const TOOLS: ToolSummary[] = [
  {
    id: "tool_web_search",
    name: "web_search",
    type: "Search",
    description: "Real web search backed by Tavily — createWebSearchTool() from samai-sdk.",
    agents: ["Research Agent", "Sales Agent"],
    calls: 24921,
    successRate: 99.8,
    avgLatencyMs: 420,
    status: "active",
    requiresApproval: false,
    schema: { query: "string", maxResults: "number?" },
  },
  {
    id: "tool_database_query",
    name: "database_query",
    type: "Database",
    description: "Parameterized read-only query against the product Postgres replica.",
    agents: ["Research Agent", "Support Agent", "Sales Agent"],
    calls: 12821,
    successRate: 98.2,
    avgLatencyMs: 180,
    status: "active",
    requiresApproval: false,
    schema: { table: "string", filters: "object", limit: "number?" },
  },
  {
    id: "tool_code_execution",
    name: "code_execution",
    type: "Sandbox",
    description: "Runs short scripts in an isolated sandbox with a 30s default timeout.",
    agents: ["Coding Agent"],
    calls: 4182,
    successRate: 96.7,
    avgLatencyMs: 1800,
    status: "active",
    requiresApproval: false,
    schema: { language: "string", code: "string" },
  },
  {
    id: "tool_read_file",
    name: "read_file",
    type: "Custom",
    description: "Reads a file from the connected repository at a given path.",
    agents: ["Coding Agent"],
    calls: 18220,
    successRate: 99.6,
    avgLatencyMs: 90,
    status: "active",
    requiresApproval: false,
    schema: { path: "string" },
  },
  {
    id: "tool_write_file",
    name: "write_file",
    type: "Custom",
    description: "Writes or patches a file in the connected repository.",
    agents: ["Coding Agent"],
    calls: 2110,
    successRate: 94.1,
    avgLatencyMs: 140,
    status: "active",
    requiresApproval: false,
    schema: { path: "string", content: "string" },
  },
  {
    id: "tool_search_code",
    name: "search_code",
    type: "Custom",
    description: "Grep-style search across the connected repository's indexed source.",
    agents: ["Coding Agent"],
    calls: 9431,
    successRate: 99.2,
    avgLatencyMs: 210,
    status: "active",
    requiresApproval: false,
    schema: { pattern: "string", path: "string?" },
  },
  {
    id: "tool_run_tests",
    name: "run_tests",
    type: "Sandbox",
    description: "Runs the repository's test suite (or a scoped subset) inside the sandbox.",
    agents: ["Coding Agent"],
    calls: 3390,
    successRate: 91.8,
    avgLatencyMs: 8200,
    status: "active",
    requiresApproval: false,
    schema: { scope: "string?" },
  },
  {
    id: "tool_git_diff",
    name: "git_diff",
    type: "Custom",
    description: "Computes a diff against the base branch for the current working changes.",
    agents: ["Coding Agent"],
    calls: 1884,
    successRate: 99.0,
    avgLatencyMs: 260,
    status: "active",
    requiresApproval: false,
    schema: { base: "string?" },
  },
  {
    id: "tool_deploy_production",
    name: "deploy_production",
    type: "Custom",
    description: "Triggers a production deployment. Approval-gated — fails closed without human sign-off.",
    agents: ["Coding Agent"],
    calls: 47,
    successRate: 87.2,
    avgLatencyMs: 41000,
    status: "active",
    requiresApproval: true,
    schema: { ref: "string", environment: "string" },
  },
  {
    id: "tool_http_request",
    name: "http_request",
    type: "HTTP",
    description: "Signed outbound HTTP call to an allow-listed internal service.",
    agents: ["Support Agent", "Sales Agent"],
    calls: 7710,
    successRate: 98.6,
    avgLatencyMs: 310,
    status: "active",
    requiresApproval: false,
    schema: { url: "string", method: "string" },
  },
];

// ---------------------------------------------------------------------------
// MCP servers
// ---------------------------------------------------------------------------

export const MCP_SERVERS: MCPServerSummary[] = [
  {
    id: "mcp_github",
    name: "GitHub",
    transport: "http",
    status: "connected",
    tools: ["create_pr", "search_issues", "get_file", "list_commits"],
    agents: ["Coding Agent"],
    lastUsed: isoAgo(6 * 60 * 1000),
    endpoint: "https://mcp.github.com/sse",
  },
  {
    id: "mcp_slack",
    name: "Slack",
    transport: "sse",
    status: "connected",
    tools: ["post_message", "search_messages", "list_channels"],
    agents: ["Support Agent", "Coding Agent"],
    lastUsed: isoAgo(22 * 60 * 1000),
    endpoint: "https://mcp.slack.com/sse",
  },
  {
    id: "mcp_notion",
    name: "Notion",
    transport: "http",
    status: "connected",
    tools: ["search_pages", "get_page", "create_page"],
    agents: ["Research Agent"],
    lastUsed: isoAgo(3 * 60 * 60 * 1000),
    endpoint: "https://mcp.notion.com/v1",
  },
  {
    id: "mcp_postgres",
    name: "Postgres",
    transport: "stdio",
    status: "error",
    tools: ["query", "describe_schema"],
    agents: ["Support Agent"],
    lastUsed: isoAgo(9 * 60 * 60 * 1000),
    endpoint: "stdio://mcp-postgres --readonly",
  },
];

// ---------------------------------------------------------------------------
// Runs + traces — generated to mirror a real samai-sdk RunTrace shape
// ---------------------------------------------------------------------------

const RESEARCH_QUERIES = [
  "Research the latest AI agent infrastructure trends.",
  "What are the tradeoffs between vector and graph memory for agents?",
  "Summarize recent developments in MCP adoption across vendors.",
  "Compare token pricing across Anthropic, OpenAI, and Gemini this quarter.",
  "What's changed in agent evaluation methodology in the last year?",
];
const CODING_QUERIES = [
  "Review the authentication implementation.",
  "Check whether the rate limiter handles concurrent requests correctly.",
  "Find dead code in the billing module and propose removals.",
  "Investigate why run_tests is flaking on the webhook handler.",
  "Review the new approval-gate middleware for edge cases.",
];
const SUPPORT_QUERIES = [
  "My refund hasn't shown up after 5 days, what's going on?",
  "How do I rotate my API key?",
  "The webhook signature verification keeps failing, why?",
  "Can you upgrade my workspace to the Team plan?",
  "I'm being rate limited unexpectedly — can you check my usage?",
];
const SALES_QUERIES = [
  "Draft an outbound email to a Series B fintech lead about our SDK.",
  "Enrich this lead record with recent funding news.",
  "Write a follow-up for a prospect who went quiet after a demo.",
];

function usage(inputTok: number, outputTok: number, cache = false): Usage {
  return {
    inputTokens: inputTok,
    outputTokens: outputTok,
    totalTokens: inputTok + outputTok,
    ...(cache ? { cacheReadTokens: Math.round(inputTok * 0.6), cacheWriteTokens: Math.round(inputTok * 0.1) } : {}),
  };
}

function buildResearchTrace(runId: string, t0: number, failure: boolean): { trace: RunTrace; durationMs: number } {
  let t = t0;
  const step = (ms: number) => (t += ms);
  const events: TraceEvent[] = [];
  events.push({ type: "run-started", agentName: "Research Agent", timestamp: t });
  events.push({ type: "model-call", agentName: "Research Agent", model: "gpt-4.1", turn: 1, timestamp: step(40) });
  events.push({ type: "model-call-completed", agentName: "Research Agent", usage: usage(1120, 180), timestamp: step(900) });
  events.push({ type: "tool-call", agentName: "Research Agent", toolName: "web_search", args: { query: "AI agent infrastructure trends 2026" }, timestamp: step(20) });
  events.push({ type: "tool-result", agentName: "Research Agent", toolName: "web_search", isError: false, durationMs: 410, timestamp: step(410) });
  events.push({ type: "tool-call", agentName: "Research Agent", toolName: "database_query", args: { table: "kb_articles", filters: { topic: "agent-infra" } }, timestamp: step(15) });
  events.push({ type: "tool-result", agentName: "Research Agent", toolName: "database_query", isError: false, durationMs: 160, timestamp: step(160) });
  events.push({ type: "model-call", agentName: "Research Agent", model: "gpt-4.1", turn: 2, timestamp: step(30) });
  events.push({ type: "model-call-completed", agentName: "Research Agent", usage: usage(1840, 260), timestamp: step(1100) });
  events.push({ type: "handoff", fromAgent: "Research Agent", toAgent: WRITER_AGENT_NAME, reason: "Enough source material gathered; delegate to writer_agent for synthesis.", timestamp: step(10) });
  events.push({ type: "model-call", agentName: WRITER_AGENT_NAME, model: "gpt-4.1", turn: 1, timestamp: step(20) });
  if (failure) {
    events.push({ type: "guardrail-triggered", stage: "output", agentName: WRITER_AGENT_NAME, guardrailName: "Citation Required", reason: "Claim about pricing lacked a cited source.", action: "blocked", timestamp: step(650) });
    events.push({ type: "run-failed", error: "GuardrailBlockedError: output blocked by Citation Required", timestamp: step(5) });
  } else {
    events.push({ type: "model-call-completed", agentName: WRITER_AGENT_NAME, usage: usage(2210, 540, true), timestamp: step(1400) });
    events.push({ type: "run-completed", timestamp: step(5) });
  }
  const totalUsage = events.reduce<Usage>(
    (acc, e) => {
      if (e.type === "model-call-completed") {
        acc.inputTokens += e.usage.inputTokens;
        acc.outputTokens += e.usage.outputTokens;
        acc.totalTokens += e.usage.totalTokens;
        acc.cacheReadTokens = (acc.cacheReadTokens ?? 0) + (e.usage.cacheReadTokens ?? 0);
        acc.cacheWriteTokens = (acc.cacheWriteTokens ?? 0) + (e.usage.cacheWriteTokens ?? 0);
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
  );
  const trace: RunTrace = {
    runId,
    startedAt: t0,
    finishedAt: t,
    agentPath: ["Research Agent", WRITER_AGENT_NAME],
    events,
    totalUsage,
  };
  return { trace, durationMs: t - t0 };
}

function buildCodingTrace(runId: string, t0: number, failure: boolean, needsApproval: boolean): { trace: RunTrace; durationMs: number } {
  let t = t0;
  const step = (ms: number) => (t += ms);
  const events: TraceEvent[] = [];
  events.push({ type: "run-started", agentName: "Coding Agent", timestamp: t });
  events.push({ type: "model-call", agentName: "Coding Agent", model: "claude-sonnet-4-6", turn: 1, timestamp: step(30) });
  events.push({ type: "model-call-completed", agentName: "Coding Agent", usage: usage(2400, 210, true), timestamp: step(1200) });
  events.push({ type: "tool-call", agentName: "Coding Agent", toolName: "search_code", args: { pattern: "verifySignature" }, timestamp: step(15) });
  events.push({ type: "tool-result", agentName: "Coding Agent", toolName: "search_code", isError: false, durationMs: 190, timestamp: step(190) });
  events.push({ type: "tool-call", agentName: "Coding Agent", toolName: "read_file", args: { path: "src/auth/verify.ts" }, timestamp: step(10) });
  events.push({ type: "tool-result", agentName: "Coding Agent", toolName: "read_file", isError: false, durationMs: 80, timestamp: step(80) });
  events.push({ type: "tool-call", agentName: "Coding Agent", toolName: "run_tests", args: { scope: "src/auth" }, timestamp: step(15) });
  if (failure) {
    events.push({ type: "tool-result", agentName: "Coding Agent", toolName: "run_tests", isError: true, durationMs: 6400, timestamp: step(6400) });
    events.push({ type: "model-call", agentName: "Coding Agent", model: "claude-sonnet-4-6", turn: 2, timestamp: step(20) });
    events.push({ type: "model-call-completed", agentName: "Coding Agent", usage: usage(1900, 340), timestamp: step(1050) });
    events.push({ type: "run-failed", error: "ToolExecutionError: test suite failed (exit code 1)", timestamp: step(5) });
  } else if (needsApproval) {
    events.push({ type: "tool-result", agentName: "Coding Agent", toolName: "run_tests", isError: false, durationMs: 7100, timestamp: step(7100) });
    events.push({ type: "tool-call", agentName: "Coding Agent", toolName: "deploy_production", args: { ref: "main", environment: "production" }, timestamp: step(20) });
    events.push({ type: "approval-requested", agentName: "Coding Agent", toolName: "deploy_production", args: { ref: "main", environment: "production" }, timestamp: step(5) });
    events.push({ type: "run-completed", timestamp: step(5) });
  } else {
    events.push({ type: "tool-result", agentName: "Coding Agent", toolName: "run_tests", isError: false, durationMs: 7100, timestamp: step(7100) });
    events.push({ type: "model-call", agentName: "Coding Agent", model: "claude-sonnet-4-6", turn: 2, timestamp: step(20) });
    events.push({ type: "model-call-completed", agentName: "Coding Agent", usage: usage(1750, 420, true), timestamp: step(1400) });
    events.push({ type: "run-completed", timestamp: step(5) });
  }
  const totalUsage = events.reduce<Usage>(
    (acc, e) => {
      if (e.type === "model-call-completed") {
        acc.inputTokens += e.usage.inputTokens;
        acc.outputTokens += e.usage.outputTokens;
        acc.totalTokens += e.usage.totalTokens;
        acc.cacheReadTokens = (acc.cacheReadTokens ?? 0) + (e.usage.cacheReadTokens ?? 0);
        acc.cacheWriteTokens = (acc.cacheWriteTokens ?? 0) + (e.usage.cacheWriteTokens ?? 0);
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
  );
  const trace: RunTrace = { runId, startedAt: t0, finishedAt: t, agentPath: ["Coding Agent"], events, totalUsage };
  return { trace, durationMs: t - t0 };
}

function buildSimpleTrace(agentName: string, model: string, runId: string, t0: number, failure: boolean): { trace: RunTrace; durationMs: number } {
  let t = t0;
  const step = (ms: number) => (t += ms);
  const events: TraceEvent[] = [];
  events.push({ type: "run-started", agentName, timestamp: t });
  events.push({ type: "model-call", agentName, model, turn: 1, timestamp: step(25) });
  events.push({ type: "tool-call", agentName, toolName: "database_query", args: { table: "customers" }, timestamp: step(15) });
  events.push({ type: "tool-result", agentName, toolName: "database_query", isError: false, durationMs: 150, timestamp: step(150) });
  if (failure) {
    events.push({ type: "guardrail-triggered", stage: "output", agentName, guardrailName: "PII Detection", reason: "Response contained an unredacted account number.", action: "blocked", timestamp: step(700) });
    events.push({ type: "run-failed", error: "GuardrailBlockedError: output blocked by PII Detection", timestamp: step(5) });
  } else {
    events.push({ type: "model-call-completed", agentName, usage: usage(640, 210), timestamp: step(900) });
    events.push({ type: "run-completed", timestamp: step(5) });
  }
  const totalUsage = events.reduce<Usage>(
    (acc, e) => {
      if (e.type === "model-call-completed") {
        acc.inputTokens += e.usage.inputTokens;
        acc.outputTokens += e.usage.outputTokens;
        acc.totalTokens += e.usage.totalTokens;
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  );
  const trace: RunTrace = { runId, startedAt: t0, finishedAt: t, agentPath: [agentName], events, totalUsage };
  return { trace, durationMs: t - t0 };
}

function generateRuns(): RunSummary[] {
  const runs: RunSummary[] = [];
  const totalRuns = 140;
  for (let i = 0; i < totalRuns; i++) {
    const agent = rng.pick(AGENTS);
    const ageMs = rng.int(30_000, 1000 * 60 * 60 * 24 * 21);
    const startedAtMs = now - ageMs;
    const runId = `run_${rng.id(6)}`;
    const isRunning = i < 3 && ageMs < 60_000;
    const outcomeRoll = rng.float();
    const failure = !isRunning && outcomeRoll > 0.955;
    const needsApproval = agent.id === "agt_coding" && !failure && !isRunning && rng.float() > 0.9;

    let built: { trace: RunTrace; durationMs: number };
    let input: string;
    let output: string | undefined;

    if (agent.id === "agt_research") {
      input = rng.pick(RESEARCH_QUERIES);
      built = buildResearchTrace(runId, startedAtMs, failure);
      output = failure ? undefined : "Synthesized research summary with cited sources, delegated to writer_agent for final formatting.";
    } else if (agent.id === "agt_coding") {
      input = rng.pick(CODING_QUERIES);
      built = buildCodingTrace(runId, startedAtMs, failure, needsApproval);
      output = failure ? undefined : needsApproval ? undefined : "Reviewed the code path, ran the relevant tests, and summarized findings with two suggested follow-ups.";
    } else if (agent.id === "agt_support") {
      input = rng.pick(SUPPORT_QUERIES);
      built = buildSimpleTrace("Support Agent", agent.model, runId, startedAtMs, failure);
      output = failure ? undefined : "Answered using the grounded knowledge-base lookup, no PII surfaced.";
    } else {
      input = rng.pick(SALES_QUERIES);
      built = buildSimpleTrace("Sales Agent", agent.model, runId, startedAtMs, failure);
      output = failure ? undefined : "Drafted outbound copy referencing verified, web-sourced company details.";
    }

    let status: RunSummary["status"];
    if (isRunning) status = "running";
    else if (needsApproval) status = "waiting_approval";
    else if (failure) status = "failed";
    else status = "success";

    runs.push({
      id: runId,
      agentId: agent.id,
      agentName: agent.name,
      environment: agent.environment,
      status,
      model: agent.model,
      durationMs: isRunning ? Date.now() - startedAtMs : built.durationMs,
      tokens: built.trace.totalUsage.totalTokens,
      costUsd: Math.max(0.002, built.trace.totalUsage.totalTokens * 0.000009),
      startedAt: new Date(startedAtMs).toISOString(),
      trace: built.trace,
      input,
      output,
    });
  }
  return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export const RUNS: RunSummary[] = generateRuns();

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export const MEMORY_RECORDS: MemoryRecord[] = [
  { id: "mem_001", type: "fact", source: "Support Agent", content: "User prefers email over chat for follow-ups.", confidence: 0.92, createdAt: isoAgo(1000 * 60 * 60 * 40), updatedAt: isoAgo(1000 * 60 * 60 * 40), version: 1, relationships: [{ predicate: "prefers", target: "Email" }] },
  { id: "mem_002", type: "graph", source: "Sales Agent", content: "Lead works at Acme Robotics as Head of Platform.", confidence: 0.88, createdAt: isoAgo(1000 * 60 * 60 * 90), updatedAt: isoAgo(1000 * 60 * 60 * 20), version: 2, relationships: [{ predicate: "works_at", target: "Acme Robotics" }] },
  { id: "mem_003", type: "vector", source: "Support Agent", content: "Embedded chunk: refund policy — 3 to 5 business days processing window.", confidence: 0.97, createdAt: isoAgo(1000 * 60 * 60 * 500), updatedAt: isoAgo(1000 * 60 * 60 * 500), version: 1 },
  { id: "mem_004", type: "session", source: "Coding Agent", content: "Session context: reviewing auth module across 3 turns, focused on src/auth/*.", confidence: 1, createdAt: isoAgo(1000 * 60 * 30), updatedAt: isoAgo(1000 * 60 * 2), version: 4 },
  { id: "mem_005", type: "graph", source: "Research Agent", content: "Sameer is building GitWiki Intelligence, uses TypeScript and PostgreSQL.", confidence: 0.9, createdAt: isoAgo(1000 * 60 * 60 * 300), updatedAt: isoAgo(1000 * 60 * 60 * 12), version: 3, relationships: [{ predicate: "uses", target: "TypeScript" }, { predicate: "uses", target: "PostgreSQL" }, { predicate: "building", target: "GitWiki Intelligence" }] },
  { id: "mem_006", type: "fact", source: "Support Agent", content: "Workspace is on the Team plan, billing contact confirmed.", confidence: 0.95, createdAt: isoAgo(1000 * 60 * 60 * 200), updatedAt: isoAgo(1000 * 60 * 60 * 200), version: 1 },
  { id: "mem_007", type: "vector", source: "Support Agent", content: "Embedded chunk: API key rotation steps — Settings > API Keys > Rotate.", confidence: 0.96, createdAt: isoAgo(1000 * 60 * 60 * 480), updatedAt: isoAgo(1000 * 60 * 60 * 480), version: 1 },
  { id: "mem_008", type: "graph", source: "Sales Agent", content: "Acme Robotics closed a $14M Series B in the last 60 days.", confidence: 0.81, createdAt: isoAgo(1000 * 60 * 60 * 70), updatedAt: isoAgo(1000 * 60 * 60 * 70), version: 1, relationships: [{ predicate: "raised", target: "Series B" }] },
  { id: "mem_009", type: "fact", source: "Research Agent", content: "User is based in India and works primarily in Next.js.", confidence: 0.93, createdAt: isoAgo(1000 * 60 * 60 * 600), updatedAt: isoAgo(1000 * 60 * 60 * 50), version: 2 },
  { id: "mem_010", type: "session", source: "Support Agent", content: "Session context: troubleshooting webhook signature verification, 2 turns.", confidence: 1, createdAt: isoAgo(1000 * 60 * 12), updatedAt: isoAgo(1000 * 60 * 1), version: 2 },
];
for (let i = 11; i <= 24; i++) {
  const types: MemoryRecord["type"][] = ["session", "vector", "graph", "fact"];
  const srcs = ["Research Agent", "Coding Agent", "Support Agent", "Sales Agent"];
  MEMORY_RECORDS.push({
    id: `mem_${String(i).padStart(3, "0")}`,
    type: rng.pick(types),
    source: rng.pick(srcs),
    content: "Embedded/derived record from a prior run — see linked session for full context.",
    confidence: rng.float(0.7, 0.99),
    createdAt: isoAgo(rng.int(1000 * 60 * 30, 1000 * 60 * 60 * 700)),
    updatedAt: isoAgo(rng.int(1000 * 60, 1000 * 60 * 60 * 200)),
    version: rng.int(1, 5),
  });
}

// ---------------------------------------------------------------------------
// Guardrail events
// ---------------------------------------------------------------------------

const GUARDRAIL_NAMES = ["PII Detection", "Prompt Injection", "Budget", "Schema Validation", "Dangerous Tool", "Citation Required"];
export const GUARDRAIL_EVENTS: GuardrailEvent[] = [];
for (let i = 0; i < 26; i++) {
  const guardrail = rng.pick(GUARDRAIL_NAMES);
  const agentName = rng.pick(AGENTS).name;
  const action = rng.pick<GuardrailEvent["action"]>(["blocked", "redacted", "warned", "allowed", "allowed", "allowed"]);
  const reasons: Record<string, string> = {
    "PII Detection": "Detected a card-number-shaped pattern in the draft response.",
    "Prompt Injection": "Potential instruction override detected in tool result content.",
    Budget: "Session token spend approaching the configured cap.",
    "Schema Validation": "Model output did not match the expected JSON schema on first attempt.",
    "Dangerous Tool": "Blocked a destructive-SQL argument pattern before execution.",
    "Citation Required": "Claim lacked a cited source before the response was returned.",
  };
  GUARDRAIL_EVENTS.push({
    id: `gr_${rng.id(6)}`,
    guardrail,
    stage: rng.pick(["input", "output", "tool"]),
    agentName,
    action,
    reason: reasons[guardrail],
    timestamp: isoAgo(rng.int(60_000, 1000 * 60 * 60 * 24 * 10)),
  });
}
GUARDRAIL_EVENTS.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const APPROVALS: ApprovalRequest[] = [
  { id: "apr_001", agentName: "Coding Agent", toolName: "deploy_production", args: { ref: "main", environment: "production" }, reason: "Production deployment is a privileged action.", risk: "high", status: "pending", timestamp: isoAgo(4 * 60 * 1000) },
  { id: "apr_002", agentName: "Support Agent", toolName: "issue_refund", args: { amount: 250, currency: "USD", customerId: "cus_88213" }, reason: "Refund exceeds the $100 auto-approve threshold.", risk: "medium", status: "pending", timestamp: isoAgo(11 * 60 * 1000) },
  { id: "apr_003", agentName: "Coding Agent", toolName: "deploy_production", args: { ref: "release/2026.09.4", environment: "production" }, reason: "Production deployment is a privileged action.", risk: "high", status: "pending", timestamp: isoAgo(26 * 60 * 1000) },
  { id: "apr_004", agentName: "Support Agent", toolName: "issue_refund", args: { amount: 180, currency: "USD", customerId: "cus_10442" }, reason: "Refund exceeds the $100 auto-approve threshold.", risk: "medium", status: "pending", timestamp: isoAgo(52 * 60 * 1000) },
  { id: "apr_005", agentName: "Coding Agent", toolName: "write_file", args: { path: "infra/prod.tf", content: "<diff withheld>" }, reason: "Write targets an infrastructure-as-code file outside the usual review path.", risk: "medium", status: "pending", timestamp: isoAgo(70 * 60 * 1000) },
];
for (let i = 0; i < 9; i++) {
  const agent = rng.pick(AGENTS.filter((a) => a.tools.some((t) => t === "deploy_production") || a.id === "agt_support"));
  const approved = rng.bool(0.78);
  APPROVALS.push({
    id: `apr_h${rng.id(5)}`,
    agentName: agent.name,
    toolName: agent.id === "agt_coding" ? "deploy_production" : "issue_refund",
    args: agent.id === "agt_coding" ? { ref: "main", environment: "production" } : { amount: rng.int(105, 400), currency: "USD" },
    reason: agent.id === "agt_coding" ? "Production deployment is a privileged action." : "Refund exceeds the auto-approve threshold.",
    risk: rng.pick(["medium", "high"]),
    status: approved ? "approved" : "rejected",
    timestamp: isoAgo(rng.int(1000 * 60 * 60 * 2, 1000 * 60 * 60 * 24 * 14)),
    resolvedAt: isoAgo(rng.int(1000 * 60, 1000 * 60 * 60 * 2)),
    resolvedBy: rng.pick(["sameer@acme.ai", "priya@acme.ai", "on-call@acme.ai"]),
  });
}

// ---------------------------------------------------------------------------
// Model providers
// ---------------------------------------------------------------------------

export const MODEL_PROVIDERS: ModelProviderSummary[] = [
  { id: "openai", name: "OpenAI", status: "operational", models: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o"], requests: 41220, latencyMs: 980, costUsd: 412.1 },
  { id: "anthropic", name: "Anthropic", status: "operational", models: ["claude-sonnet-4-6", "claude-haiku-4-5"], requests: 22810, latencyMs: 1240, costUsd: 388.7 },
  { id: "google", name: "Google", status: "operational", models: ["gemini-2.5-pro", "gemini-2.5-flash"], requests: 9880, latencyMs: 890, costUsd: 61.3 },
  { id: "groq", name: "Groq", status: "operational", models: ["llama-3.1-70b"], requests: 2140, latencyMs: 210, costUsd: 8.9 },
  { id: "mistral", name: "Mistral", status: "degraded", models: ["mistral-large-latest"], requests: 1420, latencyMs: 2100, costUsd: 6.4 },
  { id: "ollama", name: "Ollama", status: "operational", models: ["llama3.1"], requests: 340, latencyMs: 640, costUsd: 0 },
  { id: "azure", name: "Azure OpenAI", status: "operational", models: ["gpt-4.1-deployment"], requests: 610, latencyMs: 1010, costUsd: 22.4 },
  { id: "bedrock", name: "AWS Bedrock", status: "down", models: ["anthropic.claude-sonnet-4-6"], requests: 0, latencyMs: 0, costUsd: 0 },
];

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const SESSIONS: SessionSummary[] = [
  { id: "sess_a1f3c9", userId: "user_8821", agentName: "Support Agent", messages: 6, store: "RedisSessionStore", lastActive: isoAgo(90 * 1000) },
  { id: "sess_902bd1", userId: "user_1093", agentName: "Coding Agent", messages: 14, store: "FileSessionStore", lastActive: isoAgo(4 * 60 * 1000) },
  { id: "sess_e7712a", userId: "user_4471", agentName: "Sales Agent", messages: 3, store: "InMemorySessionStore", lastActive: isoAgo(1000 * 60 * 60 * 8) },
  { id: "sess_c04e88", userId: "user_2290", agentName: "Support Agent", messages: 9, store: "RedisSessionStore", lastActive: isoAgo(22 * 60 * 1000) },
  { id: "sess_1bb4a0", userId: "user_7734", agentName: "Research Agent", messages: 5, store: "SqliteSessionStore", lastActive: isoAgo(1000 * 60 * 60 * 3) },
];
for (let i = 0; i < 13; i++) {
  const agent = rng.pick(AGENTS);
  SESSIONS.push({
    id: `sess_${rng.id(6)}`,
    userId: `user_${rng.int(1000, 9999)}`,
    agentName: agent.name,
    messages: rng.int(1, 22),
    store: rng.pick(["InMemorySessionStore", "FileSessionStore", "RedisSessionStore", "SqliteSessionStore"]),
    lastActive: isoAgo(rng.int(30_000, 1000 * 60 * 60 * 48)),
  });
}
SESSIONS.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

export const EVALUATIONS: EvaluationSummary[] = [
  { id: "eval_001", name: "Research grounding v14", agentName: "Research Agent", dataset: "research-citations-200", evaluator: "claude-sonnet-4-6 (rubric)", passRate: 94.5, failedCases: 11, regression: -0.4, avgLatencyMs: 1900, tokenCost: 12.4, runAt: isoAgo(1000 * 60 * 60 * 10) },
  { id: "eval_002", name: "Coding agent safety v9", agentName: "Coding Agent", dataset: "dangerous-tool-args-120", evaluator: "rule-based", passRate: 99.2, failedCases: 1, regression: 0, avgLatencyMs: 900, tokenCost: 3.1, runAt: isoAgo(1000 * 60 * 60 * 30) },
  { id: "eval_003", name: "Support PII redaction v22", agentName: "Support Agent", dataset: "pii-conversations-300", evaluator: "regex + rubric", passRate: 99.7, failedCases: 1, regression: 0.1, avgLatencyMs: 1200, tokenCost: 2.8, runAt: isoAgo(1000 * 60 * 60 * 50) },
  { id: "eval_004", name: "Sales tone & accuracy v3", agentName: "Sales Agent", dataset: "outbound-drafts-80", evaluator: "claude-sonnet-4-6 (rubric)", passRate: 88.1, failedCases: 9, regression: -2.3, avgLatencyMs: 2400, tokenCost: 4.6, runAt: isoAgo(1000 * 60 * 60 * 90) },
];

// ---------------------------------------------------------------------------
// Usage series (30 days)
// ---------------------------------------------------------------------------

export interface UsageDay {
  date: string;
  runs: number;
  tokens: number;
  costUsd: number;
  latencyMs: number;
  toolCalls: number;
  [key: string]: unknown;
}

export const USAGE_SERIES: UsageDay[] = Array.from({ length: 30 }).map((_, i) => {
  const dayAgo = 29 - i;
  const d = new Date(now - dayAgo * 1000 * 60 * 60 * 24);
  const base = 620 + Math.sin(i / 4) * 90;
  const weekday = d.getDay();
  const weekendDip = weekday === 0 || weekday === 6 ? 0.6 : 1;
  const runs = Math.round((base + rng.float(-40, 60)) * weekendDip);
  return {
    date: d.toISOString().slice(0, 10),
    runs,
    tokens: Math.round(runs * rng.float(650, 950)),
    costUsd: Number((runs * rng.float(0.006, 0.011)).toFixed(2)),
    latencyMs: Math.round(1350 + rng.float(-220, 260)),
    toolCalls: Math.round(runs * rng.float(1.4, 2.1)),
  };
});

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getAgent(id: string) {
  return AGENTS.find((a) => a.id === id);
}
export function getRun(id: string) {
  return RUNS.find((r) => r.id === id);
}
export function getRunsForAgent(id: string) {
  return RUNS.filter((r) => r.agentId === id);
}
export function getTool(id: string) {
  return TOOLS.find((t) => t.id === id);
}
export function getMCPServer(id: string) {
  return MCP_SERVERS.find((m) => m.id === id);
}
