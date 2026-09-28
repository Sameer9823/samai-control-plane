/**
 * prisma/seed.ts
 * ---------------------------------------------------------------------------
 * Populates Postgres with the same realistic dataset the app falls back to
 * in demo mode (lib/samai/demo-data.ts) — same agents, same 140 runs with
 * full event-level traces, same tools/MCP servers/memory/guardrails/
 * approvals/providers/sessions/evaluations/usage series — just persisted
 * instead of generated in-memory on every request.
 *
 * Run with: npx prisma db seed   (wired via the "prisma.seed" key in
 * package.json), or directly: npx tsx prisma/seed.ts
 *
 * Requires `npx prisma generate` to have been run first so `@prisma/client`
 * has types for this schema.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  AGENTS,
  RUNS,
  TOOLS,
  MCP_SERVERS,
  MEMORY_RECORDS,
  GUARDRAIL_EVENTS,
  APPROVALS,
  MODEL_PROVIDERS,
  SESSIONS,
  EVALUATIONS,
  USAGE_SERIES,
} from "../lib/samai/demo-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  log: ["error"],
});

async function main() {
  const existing = await prisma.organization.count();
  if (existing > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  console.log("Seeding SamAI Control Plane...");

  const org = await prisma.organization.create({ data: { name: "Acme AI" } });
  const workspace = await prisma.workspace.create({ data: { name: "Acme AI", organizationId: org.id } });

  // Four seeded accounts, one per role, all sharing one demo password —
  // see the note on the login page. In a real deployment these would be
  // invited through Settings > Team, not seeded with a shared password.
  const demoPasswordHash = await bcrypt.hash("samai-demo", 10);
  const [owner] = await Promise.all([
    prisma.user.create({
      data: { email: "owner@acme.ai", name: "Sameer", role: "OWNER", organizationId: org.id, hashedPassword: demoPasswordHash },
    }),
    prisma.user.create({
      data: { email: "admin@acme.ai", name: "Priya", role: "ADMIN", organizationId: org.id, hashedPassword: demoPasswordHash },
    }),
    prisma.user.create({
      data: { email: "dev@acme.ai", name: "Dev", role: "DEVELOPER", organizationId: org.id, hashedPassword: demoPasswordHash },
    }),
    prisma.user.create({
      data: { email: "viewer@acme.ai", name: "Viewer", role: "VIEWER", organizationId: org.id, hashedPassword: demoPasswordHash },
    }),
  ]);

  const envNames = ["development", "staging", "production"] as const;
  const environments: Record<string, string> = {};
  for (const name of envNames) {
    const env = await prisma.environment.create({ data: { name, workspaceId: workspace.id } });
    environments[name] = env.id;
  }

  // --- Guardrails (referenced by name) -------------------------------------
  const guardrailNames = Array.from(new Set(AGENTS.flatMap((a) => a.guardrails)));
  const guardrailIds: Record<string, string> = {};
  for (const name of guardrailNames) {
    const g = await prisma.guardrail.create({ data: { name, description: `${name} guardrail` } });
    guardrailIds[name] = g.id;
  }

  // --- Tools ----------------------------------------------------------------
  const toolIds: Record<string, string> = {};
  for (const t of TOOLS) {
    const row = await prisma.tool.create({
      data: {
        name: t.name,
        type: t.type,
        description: t.description,
        schema: t.schema as object,
        requiresApproval: t.requiresApproval,
        status: t.status,
        workspaceId: workspace.id,
      },
    });
    toolIds[t.name] = row.id;
  }

  // --- Agents -----------------------------------------------------------------
  const agentIds: Record<string, string> = {};
  for (const a of AGENTS) {
    const row = await prisma.agent.create({
      data: {
        name: a.name,
        description: a.description,
        workspaceId: workspace.id,
        environmentId: environments[a.environment],
        provider: a.provider,
        model: a.model,
        temperature: a.temperature,
        maxTokens: a.maxTokens,
        instructions: a.instructions,
        memory: a.memory,
        status: a.status.toUpperCase() as "ACTIVE" | "PAUSED" | "DRAFT",
        tools: { create: a.tools.map((toolName) => ({ toolId: toolIds[toolName] })) },
        guardrails: { create: a.guardrails.map((g) => ({ guardrailId: guardrailIds[g] })) },
      },
    });
    agentIds[a.id] = row.id;
    agentIds[a.name] = row.id;

    const version = await prisma.agentVersion.create({
      data: { agentId: row.id, version: a.version, snapshot: a as unknown as object },
    });
    await prisma.agent.update({ where: { id: row.id }, data: { currentVersionId: version.id } });
  }

  // handoffs (Research Agent -> writer_agent is a virtual sub-agent name, skip if target isn't a real Agent row)
  for (const a of AGENTS) {
    for (const target of a.handoffs) {
      if (agentIds[target]) {
        await prisma.agentHandoff.create({ data: { fromAgentId: agentIds[a.id], toAgentId: agentIds[target] } });
      }
    }
  }

  // --- MCP servers -----------------------------------------------------------
  for (const m of MCP_SERVERS) {
    await prisma.mCPServer.create({
      data: {
        name: m.name,
        transport: m.transport,
        endpoint: m.endpoint,
        status: m.status,
        workspaceId: workspace.id,
        lastUsed: new Date(m.lastUsed),
        tools: { create: m.tools.map((name) => ({ name })) },
        agents: { create: m.agents.filter((name) => agentIds[name]).map((name) => ({ agentId: agentIds[name] })) },
      },
    });
  }

  // --- Runs + traces ----------------------------------------------------------
  for (const r of RUNS) {
    const run = await prisma.run.create({
      data: {
        id: r.id,
        agentId: agentIds[r.agentId],
        environmentId: environments[r.environment],
        status: r.status.toUpperCase() as "SUCCESS" | "RUNNING" | "FAILED" | "WAITING_APPROVAL" | "CANCELLED",
        model: r.model,
        input: r.input,
        output: r.output,
        inputTokens: r.trace.totalUsage.inputTokens,
        outputTokens: r.trace.totalUsage.outputTokens,
        totalTokens: r.trace.totalUsage.totalTokens,
        costUsd: r.costUsd,
        durationMs: r.durationMs,
        startedAt: new Date(r.startedAt),
        finishedAt: r.trace.finishedAt ? new Date(r.trace.finishedAt) : null,
      },
    });

    await prisma.trace.create({
      data: {
        runId: run.id,
        agentPath: r.trace.agentPath,
        totalUsage: r.trace.totalUsage as object,
        startedAt: new Date(r.trace.startedAt),
        finishedAt: r.trace.finishedAt ? new Date(r.trace.finishedAt) : null,
        events: {
          create: r.trace.events.map((e, i) => ({
            sequence: i,
            type: e.type,
            agentName: "agentName" in e ? e.agentName : null,
            payload: e as object,
            timestamp: e.timestamp,
          })),
        },
      },
    });

    // Derive ToolCall rows from tool-call/tool-result event pairs so
    // per-tool call volume/success rate/latency aggregate correctly.
    for (let i = 0; i < r.trace.events.length; i++) {
      const e = r.trace.events[i];
      if (e.type !== "tool-call") continue;
      const toolId = toolIds[e.toolName];
      if (!toolId) continue;
      const result = r.trace.events[i + 1];
      const hasResult = result && result.type === "tool-result" && result.toolName === e.toolName;
      await prisma.toolCall.create({
        data: {
          toolId,
          runId: run.id,
          args: e.args as object,
          isError: hasResult && result.type === "tool-result" ? result.isError : false,
          durationMs: hasResult && result.type === "tool-result" ? result.durationMs ?? null : null,
        },
      });
    }
  }

  // --- Memory -------------------------------------------------------------------
  for (const m of MEMORY_RECORDS) {
    await prisma.memory.create({
      data: {
        type: m.type,
        source: m.source,
        content: m.content,
        confidence: m.confidence,
        version: m.version,
        agentId: agentIds[m.source] ?? null,
        relationships: { create: (m.relationships ?? []).map((r) => ({ predicate: r.predicate, target: r.target })) },
      },
    });
  }

  // --- Guardrail events -----------------------------------------------------------
  for (const g of GUARDRAIL_EVENTS) {
    if (!guardrailIds[g.guardrail]) continue;
    await prisma.guardrailEvent.create({
      data: {
        guardrailId: guardrailIds[g.guardrail],
        agentName: g.agentName,
        stage: g.stage,
        action: g.action,
        reason: g.reason,
        timestamp: new Date(g.timestamp),
      },
    });
  }

  // --- Approvals -------------------------------------------------------------------
  for (const a of APPROVALS) {
    await prisma.approval.create({
      data: {
        runId: RUNS[0].id, // demo data doesn't tie approvals to a specific seeded run id 1:1
        agentName: a.agentName,
        toolName: a.toolName,
        args: a.args as object,
        reason: a.reason,
        risk: a.risk,
        status: a.status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED",
        timestamp: new Date(a.timestamp),
        resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null,
      },
    });
  }

  // --- Model providers --------------------------------------------------------------
  for (const p of MODEL_PROVIDERS) {
    await prisma.modelProvider.create({ data: { id: p.id, name: p.name, status: p.status } });
  }

  // --- Sessions -----------------------------------------------------------------------
  for (const s of SESSIONS) {
    if (!agentIds[s.agentName]) continue;
    await prisma.session.create({
      data: {
        userRef: s.userId,
        agentId: agentIds[s.agentName],
        store: s.store,
        lastActive: new Date(s.lastActive),
      },
    });
  }

  // --- Evaluations --------------------------------------------------------------------
  for (const e of EVALUATIONS) {
    if (!agentIds[e.agentName]) continue;
    await prisma.evaluation.create({
      data: {
        name: e.name,
        agentId: agentIds[e.agentName],
        dataset: e.dataset,
        evaluator: e.evaluator,
        runs: {
          create: [
            {
              passRate: e.passRate,
              failedCases: e.failedCases,
              regression: e.regression,
              avgLatencyMs: e.avgLatencyMs,
              tokenCost: e.tokenCost,
              runAt: new Date(e.runAt),
            },
          ],
        },
      },
    });
  }

  // --- Usage series -------------------------------------------------------------------
  for (const u of USAGE_SERIES) {
    await prisma.usageRecord.create({
      data: {
        date: new Date(u.date),
        runs: u.runs,
        tokens: u.tokens,
        costUsd: u.costUsd,
        latencyMs: u.latencyMs,
        toolCalls: u.toolCalls,
      },
    });
  }

  console.log(`Seed complete — org "${org.name}", ${AGENTS.length} agents, ${RUNS.length} runs, ${owner.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
