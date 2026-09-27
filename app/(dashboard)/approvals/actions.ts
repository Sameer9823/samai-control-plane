"use server";

import { revalidatePath } from "next/cache";
import { SamAIClient } from "@/lib/samai/client";
import { getCurrentUser } from "@/lib/auth/session";
import { canResolveApprovals } from "@/lib/auth/rbac";

/**
 * The Approvals page already hides the Approve/Reject buttons from roles
 * that can't use them (see canResolve in page.tsx), but that's a UI
 * courtesy, not a security boundary — this is the actual boundary: anyone
 * calling this server action directly (bypassing the UI) still gets
 * checked against the same `canResolveApprovals()` rule.
 */
export async function resolveApprovalAction(id: string, approved: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || !canResolveApprovals(user.role)) {
    return { ok: false, error: "Your role doesn't have permission to resolve approvals." };
  }

  await SamAIClient.resolveApproval(id, approved);
  revalidatePath("/approvals");
  return { ok: true };
}
