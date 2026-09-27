"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SamAIClient } from "@/lib/samai/client";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAgents } from "@/lib/auth/rbac";
import type { AgentFormInput } from "@/lib/samai/types";

/**
 * Zod schema for the agent builder form, matching every field the wizard in
 * components/agents/agent-builder.tsx collects: name, description, environment,
 * provider, model, temperature, maxTokens, instructions, tools[], memory,
 * guardrails[]. This is the single source of truth for what the server accepts
 * from the Create / Edit wizard — the client-side form fields are typed to the
 * same `AgentFormInput` shape so the two can't drift silently.
 */
export const agentFormSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  environment: z.enum(["development", "staging", "production"]),
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0, "Temperature must be 0 or higher").max(2, "Temperature must be 2 or lower"),
  maxTokens: z.number().int().min(1, "Max tokens is required").max(32000),
  instructions: z.string().min(1, "Instructions are required"),
  tools: z.array(z.string()),
  memory: z.enum(["none", "session", "vector", "graph", "hybrid"]),
  guardrails: z.array(z.string()),
});

/**
 * Creates a new agent. RBAC-gated: only DEVELOPER+ can call this (the UI also
 * hides the "Create Agent" button from VIEWER, but that's a courtesy, not a
 * security boundary — this server action re-checks `canManageAgents()`).
 *
 * Delegates persistence to `SamAIClient.createAgent`, which writes to Postgres
 * (Agent + initial AgentVersion + AgentTool/AgentGuardrail links) in DB mode
 * or appends to an in-memory list in demo mode — exactly mirroring how
 * `resolveApproval` delegates to `SamAIClient.resolveApproval` in
 * app/(dashboard)/approvals/actions.ts.
 */
export async function createAgentAction(
  form: AgentFormInput
): Promise<{ ok: true; agentId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || !canManageAgents(user.role)) {
    return { ok: false, error: "Your role doesn't have permission to create agents." };
  }

  const parsed = agentFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  try {
    const agent = await SamAIClient.createAgent({ ...parsed.data, status: "active" });
    revalidatePath("/agents");
    return { ok: true, agentId: agent.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create agent." };
  }
}

/**
 * Edits an existing agent. RBAC-gated (same `canManageAgents()` check). Creates
 * a new AgentVersion row rather than mutating history, and repoints
 * Agent.currentVersionId — see SamAIClient.editAgent for the data-layer
 * implementation (Postgres transaction, or in-memory update in demo mode).
 */
export async function editAgentAction(
  id: string,
  form: AgentFormInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || !canManageAgents(user.role)) {
    return { ok: false, error: "Your role doesn't have permission to edit agents." };
  }

  const parsed = agentFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  try {
    await SamAIClient.editAgent(id, parsed.data);
    revalidatePath(`/agents/${id}`);
    revalidatePath("/agents");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update agent." };
  }
}

/**
 * Updates an agent's deployment status (ACTIVE / PAUSED / DRAFT). Wired to the
 * Deploy, Pause/Resume buttons on the agent detail page. RBAC-gated the same
 * way as the approvals server action — the detail page only renders these
 * buttons for roles that can manage agents, but this is the actual boundary.
 */
export async function updateAgentStatusAction(
  id: string,
  status: "ACTIVE" | "PAUSED" | "DRAFT"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || !canManageAgents(user.role)) {
    return { ok: false, error: "Your role doesn't have permission to manage agents." };
  }

  try {
    await SamAIClient.updateAgentStatus(id, status);
    revalidatePath(`/agents/${id}`);
    revalidatePath("/agents");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update agent status." };
  }
}
