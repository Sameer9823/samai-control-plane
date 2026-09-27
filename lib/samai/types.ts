/**
 * Control-plane-facing types.
 *
 * These intentionally mirror the shapes exported by `samai-sdk` itself
 * (`RunTrace`, `TraceEvent`, `Usage`, `AgentConfig`, `AgentEvent`, ...) so that
 * `toRunSummary()` / `toTraceView()` below can take a *real* `RunTrace` coming
 * back from `runAgent()` / `runAgentStream()` and adapt it into what the UI
 * renders, with no reshaping of the runtime's own vocabulary.
 *
 * Source of truth for the runtime shapes: samai-sdk (`RunTrace`, `TraceEvent`,
 * `AgentEvent`, `Usage`) — see node_modules/samai-sdk/dist/trace-*.d.ts.
 */

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number;
};

export type TraceEvent =
  | { type: "run-started"; agentName: string; timestamp: number }
  | { type: "model-call"; agentName: string; model: string; turn: number; timestamp: number }
  | { type: "model-call-completed"; agentName: string; usage: Usage; timestamp: number }
  | { type: "tool-call"; agentName: string; toolName: string; args: unknown; timestamp: number }
  | { type: "tool-result"; agentName: string; toolName: string; isError: boolean; result?: unknown; timestamp: number; durationMs?: number }
  | { type: "handoff"; fromAgent: string; toAgent: string; reason?: string; timestamp: number }
  | { type: "retry"; agentName: string; attempt: number; delayMs: number; error: string; timestamp: number }
  | { type: "fallback"; agentName: string; failedProvider: string; nextProvider: string; error: string; timestamp: number }
  | { type: "timeout"; agentName: string; model: string; timeoutMs: number; timestamp: number }
  | { type: "guardrail-triggered"; stage: "input" | "output" | "tool"; agentName: string; guardrailName?: string; reason: string; action?: "blocked" | "redacted" | "warned"; timestamp: number }
  | { type: "approval-requested"; agentName: string; toolName: string; args?: unknown; timestamp: number }
  | { type: "approval-resolved"; agentName: string; toolName: string; approved: boolean; timestamp: number }
  | { type: "run-completed"; timestamp: number }
  | { type: "run-failed"; error: string; timestamp: number };

export interface RunTrace {
  runId: string;
  startedAt: number;
  finishedAt?: number;
  agentPath: string[];
  events: TraceEvent[];
  totalUsage: Usage;
}

export type RunStatus = "success" | "running" | "failed" | "waiting_approval" | "cancelled";

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  environment: "production" | "staging" | "development";
  provider: "anthropic" | "openai" | "google" | "groq" | "mistral" | "ollama" | "azure" | "bedrock";
  model: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
  tools: string[];
  handoffs: string[];
  memory: "none" | "session" | "vector" | "graph" | "hybrid";
  guardrails: string[];
  status: "active" | "paused" | "draft";
  version: string;
  runs: number;
  successRate: number;
  avgLatencyMs: number;
  tokens: number;
  costUsd: number;
  lastActive: string;
  createdAt: string;
}

export type AgentStatus = "active" | "paused" | "draft";

export interface AgentFormInput {
  name: string;
  description: string;
  environment: "production" | "staging" | "development";
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
  tools: string[];
  memory: "none" | "session" | "vector" | "graph" | "hybrid";
  guardrails: string[];
}

export interface RunSummary {
  id: string;
  agentId: string;
  agentName: string;
  environment: "production" | "staging" | "development";
  status: RunStatus;
  model: string;
  durationMs: number;
  tokens: number;
  costUsd: number;
  startedAt: string;
  trace: RunTrace;
  input: string;
  output?: string;
}

export interface ToolSummary {
  id: string;
  name: string;
  type: "HTTP" | "Database" | "Sandbox" | "MCP" | "Custom" | "Search";
  description: string;
  agents: string[];
  calls: number;
  successRate: number;
  avgLatencyMs: number;
  status: "active" | "disabled";
  requiresApproval: boolean;
  schema: Record<string, unknown>;
}

export interface MCPServerSummary {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  status: "connected" | "error" | "connecting";
  tools: string[];
  agents: string[];
  lastUsed: string;
  endpoint: string;
}

export interface MemoryRecord {
  id: string;
  type: "session" | "vector" | "graph" | "fact";
  source: string;
  content: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  relationships?: { predicate: string; target: string }[];
}

export interface GuardrailEvent {
  id: string;
  guardrail: string;
  stage: "input" | "output" | "tool";
  agentName: string;
  action: "blocked" | "redacted" | "warned" | "allowed";
  reason: string;
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  agentName: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ModelProviderSummary {
  id: AgentSummary["provider"];
  name: string;
  status: "operational" | "degraded" | "down";
  models: string[];
  requests: number;
  latencyMs: number;
  costUsd: number;
}

export interface SessionSummary {
  id: string;
  userId: string;
  agentName: string;
  messages: number;
  store: "InMemorySessionStore" | "FileSessionStore" | "RedisSessionStore" | "SqliteSessionStore";
  lastActive: string;
}

export interface EvaluationSummary {
  id: string;
  name: string;
  agentName: string;
  dataset: string;
  evaluator: string;
  passRate: number;
  failedCases: number;
  regression: number;
  avgLatencyMs: number;
  tokenCost: number;
  runAt: string;
}
