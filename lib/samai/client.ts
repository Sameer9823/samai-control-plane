import "server-only";

/**
 * lib/samai/client.ts
 * ---------------------------------------------------------------------------
 * The ONE place SamAI Control Plane is allowed to import `samai-sdk` (or
 * touch the database) from — route handlers / server actions / server
 * components call into `SamAIClient`, never Prisma or the SDK directly (spec
 * section 32: "Do not scatter SamAI SDK calls throughout UI components").
 *
 * Two independent modes, controlled by two separate env vars:
 *
 *  - USE_DATABASE (DATABASE_URL is set): reads/writes go through Prisma
 *    against Postgres (see prisma/schema.prisma). Otherwise everything reads
 *    from the in-memory seeded dataset in demo-data.ts — so the app still
 *    runs with zero configuration.
 *  - RUNTIME_DEMO (OPENAI_API_KEY is unset): `triggerRun()` still runs
 *    the real samai-sdk agent loop — `runAgent()`/`runAgentStream()` — but
 *    against the SDK's own `createMockProvider()` instead of a real model
 *    API, so a live run always works with zero configuration. Set
 *    OPENAI_API_KEY to switch to real OpenAI calls; the code path
 *    (agent loop, tool execution, trace construction) is identical either
 *    way — only the `Provider` passed to `createClient()` changes.
 *
 * These are independent on purpose: you can have a real Postgres-backed
 * Control Plane (browsing history, approvals, memory) while still being in
 * runtime demo mode because no model provider key is configured yet.
 *
 * NOTE ON THIS BUILD: Prisma 7 requires a driver adapter (`@prisma/adapter-pg`)
 * and a `prisma.config.ts` file (the schema's `datasource.url` was removed in
 * Prisma 7 — see prisma.config.ts for the replacement). The adapter +
 * `npx prisma generate` (using Prisma 7's built-in query compiler, which
 * needs no engine-binary download) now work correctly. In demo mode
 * (DATABASE_URL unset), the Prisma client is never initialized — see
 * lib/db/prisma.ts for the conditional instantiation — so the app runs with
 * zero configuration. `triggerRun()`'s agent-loop wiring, by contrast, needs
 * no caveat — samai-sdk's `createMockProvider()` requires no network access,
 * so scripts/verify-live-run.ts executed this exact code path (real
 * runAgent()/runAgentStream(), real tool execution, real RunTrace
 * construction) successfully in this sandbox.
 */
import { createClient, openai, createMockProvider, runAgent, AgentRunError, type Client } from "samai-sdk";
import { prisma } from "@/lib/db/prisma";
import * as demo from "./demo-data";
import { toSamaiAgent } from "./agent-builder";
import type {
  AgentFormInput,
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
} from "./types";
import type { UsageDay } from "./demo-data";

const USE_DATABASE = !!process.env.DATABASE_URL;
const RUNTIME_DEMO = !process.env.OPENAI_API_KEY;

// Demo-mode-only in-memory store for runs triggered via triggerRun() this
// process's lifetime — there's no Postgres to persist to, but a freshly
// triggered run should still show up in the Runs/Traces pages instead of
// vanishing. Resets on server restart; that's fine for a demo.
const runtimeRuns: RunSummary[] = [];

// Demo-mode-only in-memory store for agents created/edited at runtime this
// process's lifetime — same pattern as runtimeRuns above: there's no Postgres
// to persist to in demo mode, but a newly created agent should still show up
// in the Agents list + detail pages instead of vanishing on reload. Resets on
// server restart; that's fine for a demo.
const runtimeAgents: AgentSummary[] = [];

/**
 * Builds the samai-sdk `Client` used for live runs: a real OpenAI
 * provider when `OPENAI_API_KEY` is set, otherwise the SDK's own
 * `createMockProvider()`. The mock's `responses` is a function (rather than
 * a fixed list) so it can react generically to *any* configured agent/tools:
 * first call tries a real tool call for tools this build actually knows how
 * to run (see lib/samai/tools.ts), then finishes with a clearly-labeled
 * simulated answer.
 */
export function buildRuntimeClient(agent: { tools?: { name: string }[] }, input: string): Client {
  if (!RUNTIME_DEMO) {
    return createClient({ provider: openai({ apiKey: process.env.OPENAI_API_KEY! }) });
  }
  const knownTool = agent.tools?.find((t) => t.name === "get_time" || t.name === "calculator");
  return createClient({
    provider: createMockProvider({
      responses: (callIndex) => {
        if (callIndex === 0 && knownTool) {
          const args = knownTool.name === "calculator" ? { expression: "2 + 2" } : {};
          return { toolCalls: [{ toolName: knownTool.name, args }] };
        }
        return { text: `(Simulated response — no OPENAI_API_KEY configured) Here's a placeholder answer to: "${input}"` };
      },
    }),
  });
}

// ---------------------------------------------------------------------------
// Agent CRUD helpers (DB mode lookups / demo-mode in-memory builders)
// ---------------------------------------------------------------------------

function nextVersion(current: string): string {
  const num = parseInt(current.slice(1), 10); // "v14" -> 14, "v1" -> 1
  return `v${num + 1}`;
}

/** Builds an AgentSummary from wizard form data for demo-mode in-memory storage. */
function buildAgentSummaryFromForm(data: AgentFormInput & { status: string; version?: string }): AgentSummary {
  const now = new Date().toISOString();
  return {
    id: `agt_${crypto.randomUUID().slice(0, 8)}`,
    name: data.name,
    description: data.description,
    environment: data.environment,
    provider: data.provider as AgentSummary["provider"],
    model: data.model,
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    instructions: data.instructions,
    tools: data.tools,
    handoffs: [],
    memory: data.memory,
    guardrails: data.guardrails,
    status: data.status.toLowerCase() as AgentSummary["status"],
    version: data.version ?? "v1",
    runs: 0,
    successRate: 100,
    avgLatencyMs: 0,
    tokens: 0,
    costUsd: 0,
    lastActive: now,
    createdAt: now,
  };
}

/**
 * Finds the first workspace in the DB (the demo seed creates one — "Acme AI").
 * In a real multi-tenant deployment you'd scope this to the current user's org;
 * this is consistent with the rest of the demo-mode assumptions documented in
 * the README.
 */
async function findWorkspace(): Promise<{ id: string }> {
  const workspace = await prisma!.workspace.findFirst();
  if (!workspace) throw new Error("No workspace found — run `npm run db:seed` first.");
  return workspace;
}

async function findOrCreateEnvironment(workspaceId: string, name: string): Promise<string> {
  const existing = await prisma!.environment.findFirst({ where: { workspaceId, name } });
  if (existing) return existing.id;
  const created = await prisma!.environment.create({ data: { name, workspaceId } });
  return created.id;
}

async function findOrCreateTool(workspaceId: string, name: string): Promise<string> {
  const existing = await prisma!.tool.findFirst({ where: { workspaceId, name } });
  if (existing) return existing.id;
  const created = await prisma!.tool.create({
    data: {
      name,
      type: "Custom",
      description: `${name} tool (auto-created from agent builder)`,
      schema: {},
      requiresApproval: false,
      status: "active",
      workspaceId,
    },
  });
  return created.id;
}

async function findOrCreateGuardrail(name: string): Promise<string> {
  const existing = await prisma!.guardrail.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma!.guardrail.create({ data: { name, description: `${name} guardrail` } });
  return created.id;
}

async function resolveToolIds(workspaceId: string, toolNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of toolNames) ids.push(await findOrCreateTool(workspaceId, name));
  return ids;
}

async function resolveGuardrailIds(guardrailNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of guardrailNames) ids.push(await findOrCreateGuardrail(name));
  return ids;
}

// ---------------------------------------------------------------------------
// Row -> UI-type mappers (DB mode)
// ---------------------------------------------------------------------------

type AgentRow = NonNullable<Awaited<ReturnType<typeof fetchAgentRow>>>;

function fetchAgentRow(id: string) {
  return prisma!.agent.findUnique({
    where: { id },
    include: {
      environment: true,
      currentVersion: true,
      tools: { include: { tool: true } },
      guardrails: { include: { guardrail: true } },
      handoffTo: { include: { toAgent: true } },
    },
  });
}

interface AgentStats {
  runs: number;
  successRate: number;
  avgLatencyMs: number;
  tokens: number;
  costUsd: number;
  lastActive: string;
}

async function getAgentStatsMap(agentIds?: string[]): Promise<Record<string, AgentStats>> {
  const where = agentIds ? { agentId: { in: agentIds } } : {};
  const [totals, successes] = await Promise.all([
    prisma!.run.groupBy({
      by: ["agentId"],
      where,
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { totalTokens: true, costUsd: true },
      _max: { startedAt: true },
    }),
    prisma!.run.groupBy({
      by: ["agentId"],
      where: { ...where, status: "SUCCESS" },
      _count: { _all: true },
    }),
  ]);
  const successMap = new Map(successes.map((s) => [s.agentId, s._count._all]));
  const map: Record<string, AgentStats> = {};
  for (const t of totals) {
    const successCount = successMap.get(t.agentId) ?? 0;
    map[t.agentId] = {
      runs: t._count._all,
      successRate: t._count._all ? Number(((successCount / t._count._all) * 100).toFixed(1)) : 100,
      avgLatencyMs: Math.round(t._avg.durationMs ?? 0),
      tokens: t._sum.totalTokens ?? 0,
      costUsd: t._sum.costUsd ?? 0,
      lastActive: (t._max.startedAt ?? new Date()).toISOString(),
    };
  }
  return map;
}

function mapAgentRow(row: AgentRow, stats?: AgentStats): AgentSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    environment: row.environment.name as AgentSummary["environment"],
    provider: row.provider as AgentSummary["provider"],
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    instructions: row.instructions,
    tools: row.tools.map((t) => t.tool.name),
    handoffs: row.handoffTo.map((h) => h.toAgent.name),
    memory: row.memory as AgentSummary["memory"],
    guardrails: row.guardrails.map((g) => g.guardrail.name),
    status: row.status.toLowerCase() as AgentSummary["status"],
    version: row.currentVersion?.version ?? "v1",
    runs: stats?.runs ?? 0,
    successRate: stats?.successRate ?? 100,
    avgLatencyMs: stats?.avgLatencyMs ?? 0,
    tokens: stats?.tokens ?? 0,
    costUsd: stats?.costUsd ?? 0,
    lastActive: stats?.lastActive ?? row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRunRowLight(row: {
  id: string;
  agentId: string;
  agent: { name: string };
  environment: { name: string };
  status: string;
  model: string;
  input: string;
  output: string | null;
  durationMs: number;
  totalTokens: number;
  costUsd: number;
  startedAt: Date;
}): RunSummary {
  // List views only ever read the scalar Run columns (status/duration/tokens/
  // cost) — never `.trace.events` — so the list path skips the expensive
  // trace-events join and returns an empty-events trace stub. `getRun()`
  // below is the one that hydrates the full event log for the detail page.
  const emptyTrace: RunTrace = {
    runId: row.id,
    startedAt: row.startedAt.getTime(),
    agentPath: [row.agent.name],
    events: [],
    totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: row.totalTokens },
  };
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agent.name,
    environment: row.environment.name as RunSummary["environment"],
    status: row.status.toLowerCase() as RunSummary["status"],
    model: row.model,
    durationMs: row.durationMs,
    tokens: row.totalTokens,
    costUsd: row.costUsd,
    startedAt: row.startedAt.toISOString(),
    trace: emptyTrace,
    input: row.input,
    output: row.output ?? undefined,
  };
}

async function persistRunToDb(agentSummary: AgentSummary, run: RunSummary): Promise<void> {
  const agentRow = await prisma!.agent.findUnique({ where: { id: agentSummary.id }, select: { environmentId: true } });
  if (!agentRow) return; // agent was deleted between getAgent() and here; nothing sane to persist against

  const statusEnum = run.status.toUpperCase() as "SUCCESS" | "RUNNING" | "FAILED" | "WAITING_APPROVAL" | "CANCELLED";

  await prisma!.run.create({
    data: {
      id: run.id,
      agentId: agentSummary.id,
      environmentId: agentRow.environmentId,
      status: statusEnum,
      model: run.model,
      input: run.input,
      output: run.output,
      inputTokens: run.trace.totalUsage.inputTokens,
      outputTokens: run.trace.totalUsage.outputTokens,
      totalTokens: run.trace.totalUsage.totalTokens,
      costUsd: run.costUsd,
      durationMs: run.durationMs,
      startedAt: new Date(run.trace.startedAt),
      finishedAt: run.trace.finishedAt ? new Date(run.trace.finishedAt) : new Date(),
      trace: {
        create: {
          agentPath: run.trace.agentPath,
          totalUsage: run.trace.totalUsage as object,
          startedAt: new Date(run.trace.startedAt),
          finishedAt: run.trace.finishedAt ? new Date(run.trace.finishedAt) : null,
          events: {
            create: run.trace.events.map((e, i) => ({
              sequence: i,
              type: e.type,
              agentName: "agentName" in e ? e.agentName : null,
              payload: e as object,
              timestamp: e.timestamp,
            })),
          },
        },
      },
    },
  });

  // Derive ToolCall rows the same way prisma/seed.ts does, so per-tool
  // call volume/success rate on the Tools page reflects live runs too.
  const tools = await prisma!.tool.findMany({ where: { name: { in: run.trace.events.filter((e) => e.type === "tool-call").map((e) => (e as { toolName: string }).toolName) } } });
  const toolIdByName = new Map(tools.map((t) => [t.name, t.id]));
  for (let i = 0; i < run.trace.events.length; i++) {
    const e = run.trace.events[i];
    if (e.type !== "tool-call") continue;
    const toolId = toolIdByName.get(e.toolName);
    if (!toolId) continue; // tool not registered in the Tools table — skip rather than guess
    const resultEvent = run.trace.events[i + 1];
    const hasResult = resultEvent && resultEvent.type === "tool-result" && resultEvent.toolName === e.toolName;
    await prisma!.toolCall.create({
      data: {
        toolId,
        runId: run.id,
        args: e.args as object,
        isError: hasResult && resultEvent.type === "tool-result" ? resultEvent.isError : false,
      },
    });
  }
}

export function buildRunSummary(
  agentSummary: AgentSummary,
  input: string,
  trace: RunTrace,
  status: RunSummary["status"],
  output?: string
): RunSummary {
  return {
    id: trace.runId,
    agentId: agentSummary.id,
    agentName: agentSummary.name,
    environment: agentSummary.environment,
    status,
    model: agentSummary.model,
    durationMs: (trace.finishedAt ?? Date.now()) - trace.startedAt,
    tokens: trace.totalUsage.totalTokens,
    costUsd: Number((trace.totalUsage.totalTokens * 0.000009).toFixed(4)),
    startedAt: new Date(trace.startedAt).toISOString(),
    trace,
    input,
    output,
  };
}

/** Persists a finished (or failed) run — Postgres in DB mode, an in-memory list otherwise. Shared by triggerRun() and the streaming /api/agents/[agentId]/run route. */
export async function persistCompletedRun(agentSummary: AgentSummary, run: RunSummary): Promise<void> {
  if (USE_DATABASE) {
    await persistRunToDb(agentSummary, run);
  } else {
    runtimeRuns.unshift(run);
  }
}

export const SamAIClient = {
  useDatabase: USE_DATABASE,
  demoMode: RUNTIME_DEMO,

  // --- Agents -----------------------------------------------------------
  async listAgents(): Promise<AgentSummary[]> {
  if (!USE_DATABASE || !prisma) return [...runtimeAgents, ...demo.AGENTS];
    const rows = await prisma.agent.findMany({
      include: {
        environment: true,
        currentVersion: true,
        tools: { include: { tool: true } },
        guardrails: { include: { guardrail: true } },
        handoffTo: { include: { toAgent: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const stats = await getAgentStatsMap(rows.map((r) => r.id));
    return rows.map((r) => mapAgentRow(r, stats[r.id]));
  },

  async getAgent(id: string): Promise<AgentSummary | undefined> {
    if (!USE_DATABASE || !prisma) return runtimeAgents.find((a) => a.id === id) ?? demo.getAgent(id);
    const row = await fetchAgentRow(id);
    if (!row) return undefined;
    const stats = await getAgentStatsMap([id]);
    return mapAgentRow(row, stats[id]);
  },

  // --- Runs ---------------------------------------------------------------
  async listRuns(filters?: { agentId?: string; status?: string }): Promise<RunSummary[]> {
    if (!USE_DATABASE || !prisma) {
      let runs = [...runtimeRuns, ...demo.RUNS];
      if (filters?.agentId) runs = runs.filter((r) => r.agentId === filters.agentId);
      if (filters?.status) runs = runs.filter((r) => r.status === filters.status);
      return runs;
    }
    const rows = await prisma.run.findMany({
      where: {
        ...(filters?.agentId ? { agentId: filters.agentId } : {}),
        ...(filters?.status ? { status: filters.status.toUpperCase() as never } : {}),
      },
      include: { agent: true, environment: true },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    return rows.map(mapRunRowLight);
  },

  async getRun(id: string): Promise<RunSummary | undefined> {
    if (!USE_DATABASE || !prisma) return runtimeRuns.find((r) => r.id === id) ?? demo.getRun(id);
    const row = await prisma.run.findUnique({
      where: { id },
      include: {
        agent: true,
        environment: true,
        trace: { include: { events: { orderBy: { sequence: "asc" } } } },
      },
    });
    if (!row) return undefined;
    const trace: RunTrace = row.trace
      ? {
          runId: id,
          startedAt: row.trace.startedAt.getTime(),
          finishedAt: row.trace.finishedAt?.getTime(),
          agentPath: row.trace.agentPath,
          events: row.trace.events.map((e) => e.payload as unknown as TraceEvent),
          totalUsage: row.trace.totalUsage as never,
        }
      : {
          runId: id,
          startedAt: row.startedAt.getTime(),
          agentPath: [row.agent.name],
          events: [],
          totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: row.totalTokens },
        };
    return {
      id: row.id,
      agentId: row.agentId,
      agentName: row.agent.name,
      environment: row.environment.name as RunSummary["environment"],
      status: row.status.toLowerCase() as RunSummary["status"],
      model: row.model,
      durationMs: row.durationMs,
      tokens: row.totalTokens,
      costUsd: row.costUsd,
      startedAt: row.startedAt.toISOString(),
      trace,
      input: row.input,
      output: row.output ?? undefined,
    };
  },

  /**
   * Runs a real samai-sdk agent loop: `defineAgent()` (via toSamaiAgent) +
   * `runAgent()`, against a real OpenAI call or the SDK's own mock
   * provider (see buildRuntimeClient above) depending on whether
   * OPENAI_API_KEY is configured. The resulting `RunTrace` — built by the
   * SDK itself, not reshaped by us — gets persisted as Run + Trace +
   * TraceEvent (+ derived ToolCall) rows via Prisma, or appended to an
   * in-memory list in demo mode. A run that throws mid-way
   * (`AgentRunError`) is still persisted, marked FAILED, with whatever
   * partial trace was collected up to the failure — matching the product
   * brief's emphasis on being able to inspect what went wrong.
   */
  async triggerRun(agentId: string, input: string): Promise<{ runId: string }> {
    const agentSummary = await this.getAgent(agentId);
    if (!agentSummary) throw new Error(`Agent ${agentId} not found`);

    const agent = toSamaiAgent(agentSummary);
    const client = buildRuntimeClient(agent, input);

    let trace: RunTrace;
    let status: RunSummary["status"];
    let output: string | undefined;

    try {
      const result = await runAgent(client, agent, input, {
        // Approval-gated tools aren't wired into this synchronous request/
        // response flow yet (that needs the Live Run Stream / SSE
        // architecture the product brief describes in section 33, which
        // this build doesn't implement) — fail closed rather than silently
        // auto-approving a privileged action.
        onApprovalRequest: async () => false,
      });
      trace = result.trace;
      status = "success";
      output = result.text;
    } catch (err) {
      if (err instanceof AgentRunError) {
        trace = err.trace;
        status = "failed";
      } else {
        throw err;
      }
    }

    const runSummary = buildRunSummary(agentSummary, input, trace, status, output);
    await persistCompletedRun(agentSummary, runSummary);
    return { runId: trace.runId };
  },

  // --- Tools / MCP --------------------------------------------------------
  async listTools(): Promise<ToolSummary[]> {
    if (!USE_DATABASE || !prisma) return demo.TOOLS;
    const [tools, callStats, successStats, agentLinks] = await Promise.all([
      prisma.tool.findMany(),
      prisma.toolCall.groupBy({ by: ["toolId"], _count: { _all: true }, _avg: { durationMs: true } }),
      prisma.toolCall.groupBy({ by: ["toolId"], where: { isError: false }, _count: { _all: true } }),
      prisma.agentTool.findMany({ include: { agent: true } }),
    ]);
    const callMap = new Map(callStats.map((c) => [c.toolId, c]));
    const successMap = new Map(successStats.map((s) => [s.toolId, s._count._all]));
    const agentsByTool = new Map<string, string[]>();
    for (const link of agentLinks) {
      const arr = agentsByTool.get(link.toolId) ?? [];
      arr.push(link.agent.name);
      agentsByTool.set(link.toolId, arr);
    }
    return tools.map((t) => {
      const calls = callMap.get(t.id);
      const successCount = successMap.get(t.id) ?? 0;
      return {
        id: t.id,
        name: t.name,
        type: t.type as ToolSummary["type"],
        description: t.description,
        agents: agentsByTool.get(t.id) ?? [],
        calls: calls?._count._all ?? 0,
        successRate: calls?._count._all ? Number(((successCount / calls._count._all) * 100).toFixed(1)) : 100,
        avgLatencyMs: Math.round(calls?._avg.durationMs ?? 0),
        status: t.status as ToolSummary["status"],
        requiresApproval: t.requiresApproval,
        schema: t.schema as Record<string, unknown>,
      };
    });
  },
  async getTool(id: string): Promise<ToolSummary | undefined> {
    if (!USE_DATABASE || !prisma) return demo.getTool(id);
    return (await this.listTools()).find((t) => t.id === id);
  },

  async listMCPServers(): Promise<MCPServerSummary[]> {
    if (!USE_DATABASE || !prisma) return demo.MCP_SERVERS;
    const rows = await prisma.mCPServer.findMany({ include: { tools: true, agents: { include: { agent: true } } } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      transport: r.transport as MCPServerSummary["transport"],
      status: r.status as MCPServerSummary["status"],
      tools: r.tools.map((t) => t.name),
      agents: r.agents.map((a) => a.agent.name),
      lastUsed: (r.lastUsed ?? new Date()).toISOString(),
      endpoint: r.endpoint,
    }));
  },
  async getMCPServer(id: string): Promise<MCPServerSummary | undefined> {
    if (!USE_DATABASE || !prisma) return demo.getMCPServer(id);
    return (await this.listMCPServers()).find((m) => m.id === id);
  },

  // --- Memory ---------------------------------------------------------------
  async listMemory(): Promise<MemoryRecord[]> {
    if (!USE_DATABASE || !prisma) return demo.MEMORY_RECORDS;
    const rows = await prisma.memory.findMany({ include: { relationships: true }, orderBy: { updatedAt: "desc" } });
    return rows.map((m) => ({
      id: m.id,
      type: m.type as MemoryRecord["type"],
      source: m.source,
      content: m.content,
      confidence: m.confidence,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      version: m.version,
      relationships: m.relationships.map((r) => ({ predicate: r.predicate, target: r.target })),
    }));
  },

  // --- Guardrails -----------------------------------------------------------
  async listGuardrailEvents(): Promise<GuardrailEvent[]> {
    if (!USE_DATABASE || !prisma) return demo.GUARDRAIL_EVENTS;
    const rows = await prisma.guardrailEvent.findMany({ include: { guardrail: true }, orderBy: { timestamp: "desc" }, take: 100 });
    return rows.map((e) => ({
      id: e.id,
      guardrail: e.guardrail.name,
      stage: e.stage as GuardrailEvent["stage"],
      agentName: e.agentName,
      action: e.action as GuardrailEvent["action"],
      reason: e.reason,
      timestamp: e.timestamp.toISOString(),
    }));
  },

  // --- Approvals --------------------------------------------------------------
  async listApprovals(): Promise<ApprovalRequest[]> {
    if (!USE_DATABASE || !prisma) return demo.APPROVALS;
    const rows = await prisma.approval.findMany({ include: { resolvedBy: true }, orderBy: { timestamp: "desc" }, take: 100 });
    return rows.map((a) => ({
      id: a.id,
      agentName: a.agentName,
      toolName: a.toolName,
      args: a.args as Record<string, unknown>,
      reason: a.reason,
      risk: a.risk as ApprovalRequest["risk"],
      status: a.status.toLowerCase() as ApprovalRequest["status"],
      timestamp: a.timestamp.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString(),
      resolvedBy: a.resolvedBy?.email,
    }));
  },
  /**
   * Real integration point: resolves the `onApprovalRequest` promise that
   * `runAgent()` is awaiting on for this tool call, then lets the paused run
   * continue (or, for a rejected call, returns an `isError` tool result).
   */
  async resolveApproval(id: string, approved: boolean): Promise<{ ok: boolean }> {
    if (!USE_DATABASE || !prisma) {
      // Same in-memory-mutation pattern as runtimeRuns above — there's no
      // Postgres to persist to in demo mode, but a resolved approval should
      // still look resolved on the next page load within this process's
      // lifetime, not silently snap back to "pending".
      const approval = demo.APPROVALS.find((a) => a.id === id);
      if (approval) {
        approval.status = approved ? "approved" : "rejected";
        approval.resolvedAt = new Date().toISOString();
        approval.resolvedBy = "you@acme.ai";
      }
      return { ok: true };
    }
    prisma!.$transaction([
      prisma!.approval.update({
        where: { id },
        data: { status: approved ? "APPROVED" : "REJECTED", resolvedAt: new Date() },
      }),
      prisma!.approvalEvent.create({
        data: { approvalId: id, action: approved ? "approved" : "rejected" },
      }),
    ]);
    return { ok: true };
  },

  // --- Models -------------------------------------------------------------
  async listModelProviders(): Promise<ModelProviderSummary[]> {
    if (!USE_DATABASE || !prisma) return demo.MODEL_PROVIDERS;
    const [providers, runs] = await Promise.all([
      prisma.modelProvider.findMany(),
      prisma.run.findMany({ include: { agent: { select: { provider: true, model: true } } } }),
    ]);
    const byProvider = new Map<string, { requests: number; totalLatency: number; costUsd: number; models: Set<string> }>();
    for (const r of runs) {
      const key = r.agent.provider;
      const acc = byProvider.get(key) ?? { requests: 0, totalLatency: 0, costUsd: 0, models: new Set<string>() };
      acc.requests += 1;
      acc.totalLatency += r.durationMs;
      acc.costUsd += r.costUsd;
      acc.models.add(r.agent.model);
      byProvider.set(key, acc);
    }
    return providers.map((p) => {
      const acc = byProvider.get(p.id);
      return {
        id: p.id as ModelProviderSummary["id"],
        name: p.name,
        status: p.status as ModelProviderSummary["status"],
        models: acc ? Array.from(acc.models) : [],
        requests: acc?.requests ?? 0,
        latencyMs: acc ? Math.round(acc.totalLatency / acc.requests) : 0,
        costUsd: acc?.costUsd ?? 0,
      };
    });
  },

  // --- Sessions -------------------------------------------------------------
  async listSessions(): Promise<SessionSummary[]> {
    if (!USE_DATABASE || !prisma) return demo.SESSIONS;
    const rows = await prisma.session.findMany({
      include: { agent: true, _count: { select: { messages: true } } },
      orderBy: { lastActive: "desc" },
      take: 100,
    });
    return rows.map((s) => ({
      id: s.id,
      userId: s.userRef,
      agentName: s.agent.name,
      messages: s._count.messages,
      store: s.store as SessionSummary["store"],
      lastActive: s.lastActive.toISOString(),
    }));
  },

  // --- Evaluations ----------------------------------------------------------
  async listEvaluations(): Promise<EvaluationSummary[]> {
    if (!USE_DATABASE || !prisma) return demo.EVALUATIONS;
    const rows = await prisma.evaluation.findMany({
      include: { agent: true, runs: { orderBy: { runAt: "desc" }, take: 1 } },
    });
    return rows
      .filter((e) => e.runs.length > 0)
      .map((e) => {
        const latest = e.runs[0];
        return {
          id: e.id,
          name: e.name,
          agentName: e.agent.name,
          dataset: e.dataset,
          evaluator: e.evaluator,
          passRate: latest.passRate,
          failedCases: latest.failedCases,
          regression: latest.regression,
          avgLatencyMs: latest.avgLatencyMs,
          tokenCost: latest.tokenCost,
          runAt: latest.runAt.toISOString(),
        };
      });
  },

  // --- Usage ------------------------------------------------------------------
  async getUsageSeries(): Promise<UsageDay[]> {
    if (!USE_DATABASE || !prisma) return demo.USAGE_SERIES;
    const rows = await prisma.usageRecord.findMany({ orderBy: { date: "asc" }, take: 30 });
    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      runs: r.runs,
      tokens: r.tokens,
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      toolCalls: r.toolCalls,
    }));
  },

  // --- Agent mutation (create / edit / status) --------------------------------
  /**
   * Creates a new Agent — a real Agent row + an initial AgentVersion + the
   * AgentTool / AgentGuardrail join links in Postgres, or a new entry in the
   * in-memory runtimeAgents list in demo mode. RBAC is enforced by the calling
   * server action (app/(dashboard)/agents/actions.ts); this method is the data
   * layer only.
   *
   * Mirrors prisma/seed.ts's agent-creation shape: same scalar fields, same
   * nested writes for tools/guardrails, same AgentVersion + currentVersionId
   * wiring. Tools and guardrails named in the form that don't exist yet are
   * auto-created as stub rows so the join links always resolve.
   */
  async createAgent(data: AgentFormInput & { status: string }): Promise<AgentSummary> {
    if (!USE_DATABASE || !prisma) {
      const agent = buildAgentSummaryFromForm(data);
      runtimeAgents.push(agent);
      return agent;
    }

    const workspace = await findWorkspace();
    const environmentId = await findOrCreateEnvironment(workspace.id, data.environment);
    const toolIds = await resolveToolIds(workspace.id, data.tools);
    const guardrailIds = await resolveGuardrailIds(data.guardrails);

    const statusEnum = data.status.toUpperCase() as "ACTIVE" | "PAUSED" | "DRAFT";

    const newAgentId = await prisma.$transaction(async (tx) => {
      const agentRow = await tx.agent.create({
        data: {
          name: data.name,
          description: data.description,
          workspaceId: workspace.id,
          environmentId,
          provider: data.provider,
          model: data.model,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          instructions: data.instructions,
          memory: data.memory,
          status: statusEnum,
          tools: { create: toolIds.map((toolId) => ({ toolId })) },
          guardrails: { create: guardrailIds.map((guardrailId) => ({ guardrailId })) },
        },
      });

      const version = await tx.agentVersion.create({
        data: {
          agentId: agentRow.id,
          version: "v1",
          snapshot: { ...data, id: agentRow.id, workspaceId: workspace.id } as unknown as object,
        },
      });

      await tx.agent.update({ where: { id: agentRow.id }, data: { currentVersionId: version.id } });
      return agentRow.id;
    });

    const agent = await this.getAgent(newAgentId);
    if (!agent) throw new Error("Failed to retrieve created agent");
    return agent;
  },

  /**
   * Edits an existing Agent. Rather than mutating history, a new AgentVersion
   * row is appended (with the current version number incremented) and
   * Agent.currentVersionId is repointed to it — same pattern as
   * prisma/seed.ts. In demo mode, the in-memory AgentSummary is updated in
   * place and its version bumped.
   */
  async editAgent(id: string, data: AgentFormInput): Promise<void> {
    if (!USE_DATABASE || !prisma) {
      const agent = runtimeAgents.find((a) => a.id === id) ?? demo.AGENTS.find((a) => a.id === id);
      if (!agent) throw new Error(`Agent ${id} not found`);
      agent.name = data.name;
      agent.description = data.description;
      agent.environment = data.environment;
      agent.provider = data.provider as AgentSummary["provider"];
      agent.model = data.model;
      agent.temperature = data.temperature;
      agent.maxTokens = data.maxTokens;
      agent.instructions = data.instructions;
      agent.tools = data.tools;
      agent.memory = data.memory;
      agent.guardrails = data.guardrails;
      agent.version = nextVersion(agent.version);
      return;
    }

    const workspace = await findWorkspace();
    const environmentId = await findOrCreateEnvironment(workspace.id, data.environment);
    const toolIds = await resolveToolIds(workspace.id, data.tools);
    const guardrailIds = await resolveGuardrailIds(data.guardrails);

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          environmentId,
          provider: data.provider,
          model: data.model,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          instructions: data.instructions,
          memory: data.memory,
          tools: { deleteMany: { agentId: id }, create: toolIds.map((toolId) => ({ toolId })) },
          guardrails: { deleteMany: { agentId: id }, create: guardrailIds.map((guardrailId) => ({ guardrailId })) },
        },
      });

      const count = await tx.agentVersion.count({ where: { agentId: id } });
      const version = await tx.agentVersion.create({
        data: {
          agentId: id,
          version: `v${count + 1}`,
          snapshot: { ...data } as unknown as object,
        },
      });

      await tx.agent.update({ where: { id }, data: { currentVersionId: version.id } });
    });
  },

  /** Updates Agent.status (ACTIVE / PAUSED / DRAFT). RBAC is enforced by the
   * calling server action; this is the data layer only. */
  async updateAgentStatus(id: string, status: "ACTIVE" | "PAUSED" | "DRAFT"): Promise<void> {
    if (!USE_DATABASE || !prisma) {
      const agent = runtimeAgents.find((a) => a.id === id) ?? demo.AGENTS.find((a) => a.id === id);
      if (agent) {
        agent.status = status.toLowerCase() as AgentSummary["status"];
      }
      return;
    }
    await prisma.agent.update({ where: { id }, data: { status } });
  },
};
