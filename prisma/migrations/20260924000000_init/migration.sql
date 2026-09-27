-- SamAI Control Plane — initial schema
-- Hand-derived from prisma/schema.prisma and verified by applying it
-- directly to a live PostgreSQL 16 instance (this sandbox's network can't
-- reach binaries.prisma.sh to run `prisma migrate dev` itself — see
-- prisma/schema.prisma header). Once you have normal internet access,
-- `npx prisma migrate dev` will regenerate an equivalent migration from
-- the schema directly; this file is provided so `npx prisma migrate deploy`
-- works immediately without needing to run `migrate dev` first.

-- Enums
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT');
CREATE TYPE "RunStatus" AS ENUM ('SUCCESS', 'RUNNING', 'FAILED', 'WAITING_APPROVAL', 'CANCELLED');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Tenancy
CREATE TABLE "organizations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

CREATE TABLE "workspaces" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "workspaces_organizationId_idx" ON "workspaces"("organizationId");

CREATE TABLE "environments" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  UNIQUE ("workspaceId", "name")
);

-- Agents
CREATE TABLE "agent_versions" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("agentId", "version")
);

CREATE TABLE "agents" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "environmentId" TEXT NOT NULL REFERENCES "environments"("id"),
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  "maxTokens" INTEGER NOT NULL DEFAULT 4096,
  "instructions" TEXT NOT NULL,
  "memory" TEXT NOT NULL DEFAULT 'session',
  "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT UNIQUE REFERENCES "agent_versions"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");
CREATE INDEX "agents_environmentId_idx" ON "agents"("environmentId");

ALTER TABLE "agent_versions"
  ADD CONSTRAINT "agent_versions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE;

CREATE TABLE "tools" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "schema" JSONB NOT NULL,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "workspaceId" TEXT NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  UNIQUE ("workspaceId", "name")
);

CREATE TABLE "agent_tools" (
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "toolId" TEXT NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE,
  PRIMARY KEY ("agentId", "toolId")
);

CREATE TABLE "agent_handoffs" (
  "id" TEXT PRIMARY KEY,
  "fromAgentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "toAgentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  UNIQUE ("fromAgentId", "toAgentId")
);

CREATE TABLE "guardrails" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL
);

CREATE TABLE "agent_guardrails" (
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "guardrailId" TEXT NOT NULL REFERENCES "guardrails"("id") ON DELETE CASCADE,
  PRIMARY KEY ("agentId", "guardrailId")
);

-- MCP
CREATE TABLE "mcp_servers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "transport" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "workspaceId" TEXT NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "lastUsed" TIMESTAMP(3),
  UNIQUE ("workspaceId", "name")
);

CREATE TABLE "mcp_tools" (
  "id" TEXT PRIMARY KEY,
  "mcpServerId" TEXT NOT NULL REFERENCES "mcp_servers"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  UNIQUE ("mcpServerId", "name")
);

-- Runs, traces
CREATE TABLE "runs" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id"),
  "environmentId" TEXT NOT NULL REFERENCES "environments"("id"),
  "status" "RunStatus" NOT NULL,
  "model" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "output" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);
CREATE INDEX "runs_agentId_idx" ON "runs"("agentId");
CREATE INDEX "runs_environmentId_idx" ON "runs"("environmentId");
CREATE INDEX "runs_status_idx" ON "runs"("status");
CREATE INDEX "runs_startedAt_idx" ON "runs"("startedAt");

CREATE TABLE "run_events" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "run_events_runId_idx" ON "run_events"("runId");

CREATE TABLE "traces" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL UNIQUE REFERENCES "runs"("id") ON DELETE CASCADE,
  "agentPath" TEXT[] NOT NULL,
  "totalUsage" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3)
);

CREATE TABLE "trace_events" (
  "id" TEXT PRIMARY KEY,
  "traceId" TEXT NOT NULL REFERENCES "traces"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "agentName" TEXT,
  "payload" JSONB NOT NULL,
  "timestamp" DOUBLE PRECISION NOT NULL,
  UNIQUE ("traceId", "sequence")
);
CREATE INDEX "trace_events_traceId_idx" ON "trace_events"("traceId");

CREATE TABLE "tool_calls" (
  "id" TEXT PRIMARY KEY,
  "toolId" TEXT NOT NULL REFERENCES "tools"("id"),
  "runId" TEXT NOT NULL,
  "args" JSONB NOT NULL,
  "isError" BOOLEAN NOT NULL DEFAULT false,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "tool_calls_toolId_idx" ON "tool_calls"("toolId");
CREATE INDEX "tool_calls_runId_idx" ON "tool_calls"("runId");

CREATE TABLE "guardrail_events" (
  "id" TEXT PRIMARY KEY,
  "guardrailId" TEXT NOT NULL REFERENCES "guardrails"("id"),
  "runId" TEXT REFERENCES "runs"("id"),
  "agentName" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "guardrail_events_guardrailId_idx" ON "guardrail_events"("guardrailId");
CREATE INDEX "guardrail_events_runId_idx" ON "guardrail_events"("runId");

-- Memory
CREATE TABLE "memory" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "agentId" TEXT REFERENCES "agents"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "memory_agentId_idx" ON "memory"("agentId");
CREATE INDEX "memory_type_idx" ON "memory"("type");

CREATE TABLE "memory_relations" (
  "id" TEXT PRIMARY KEY,
  "memoryId" TEXT NOT NULL REFERENCES "memory"("id") ON DELETE CASCADE,
  "predicate" TEXT NOT NULL,
  "target" TEXT NOT NULL
);
CREATE INDEX "memory_relations_memoryId_idx" ON "memory_relations"("memoryId");

-- Models
CREATE TABLE "model_providers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'operational'
);

CREATE TABLE "model_configurations" (
  "id" TEXT PRIMARY KEY,
  "providerId" TEXT NOT NULL REFERENCES "model_providers"("id"),
  "model" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isFallback" BOOLEAN NOT NULL DEFAULT false,
  "retries" INTEGER NOT NULL DEFAULT 2,
  "timeoutMs" INTEGER NOT NULL DEFAULT 30000
);

-- Sessions
CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "userRef" TEXT NOT NULL,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id"),
  "store" TEXT NOT NULL,
  "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "sessions_agentId_idx" ON "sessions"("agentId");

CREATE TABLE "messages" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "messages_sessionId_idx" ON "messages"("sessionId");

-- Evaluations
CREATE TABLE "evaluations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id"),
  "dataset" TEXT NOT NULL,
  "evaluator" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "evaluations_agentId_idx" ON "evaluations"("agentId");

CREATE TABLE "evaluation_runs" (
  "id" TEXT PRIMARY KEY,
  "evaluationId" TEXT NOT NULL REFERENCES "evaluations"("id") ON DELETE CASCADE,
  "passRate" DOUBLE PRECISION NOT NULL,
  "failedCases" INTEGER NOT NULL,
  "regression" DOUBLE PRECISION NOT NULL,
  "avgLatencyMs" INTEGER NOT NULL,
  "tokenCost" DOUBLE PRECISION NOT NULL,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "evaluation_runs_evaluationId_idx" ON "evaluation_runs"("evaluationId");

CREATE TABLE "evaluation_results" (
  "id" TEXT PRIMARY KEY,
  "evaluationRunId" TEXT NOT NULL REFERENCES "evaluation_runs"("id") ON DELETE CASCADE,
  "caseName" TEXT NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "detail" JSONB
);
CREATE INDEX "evaluation_results_evaluationRunId_idx" ON "evaluation_results"("evaluationRunId");

-- Approvals
CREATE TABLE "approvals" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "agentName" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "args" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "risk" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT REFERENCES "users"("id")
);
CREATE INDEX "approvals_runId_idx" ON "approvals"("runId");
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

CREATE TABLE "approval_events" (
  "id" TEXT PRIMARY KEY,
  "approvalId" TEXT NOT NULL REFERENCES "approvals"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "approval_events_approvalId_idx" ON "approval_events"("approvalId");

-- Usage, keys, webhooks
CREATE TABLE "usage_records" (
  "id" TEXT PRIMARY KEY,
  "date" DATE NOT NULL UNIQUE,
  "runs" INTEGER NOT NULL,
  "tokens" INTEGER NOT NULL,
  "costUsd" DOUBLE PRECISION NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "toolCalls" INTEGER NOT NULL
);

CREATE TABLE "api_keys" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hashedKey" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "workspaceId" TEXT REFERENCES "workspaces"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3)
);
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

CREATE TABLE "webhooks" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "events" TEXT[] NOT NULL,
  "secret" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "workspaceId" TEXT REFERENCES "workspaces"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "webhooks_organizationId_idx" ON "webhooks"("organizationId");
