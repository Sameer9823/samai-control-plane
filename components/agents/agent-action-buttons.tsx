"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { Pencil, Rocket, Pause, Loader2 } from "lucide-react";
import { updateAgentStatusAction } from "@/app/(dashboard)/agents/actions";

/**
 * Deploy / Pause / Resume / Edit buttons for the agent detail page.
 *
 * These are wired to the `updateAgentStatusAction` server action the same way
 * approval-center.tsx calls `resolveApprovalAction` — via `useTransition` so the
 * UI stays responsive, with an optimistic status flip + rollback on failure.
 * The Run button is retained for visual parity but the actual live-run UI is
 * the RunAgentPanel shown conditionally elsewhere on the page.
 */
export function AgentActionButtons({
  agentId,
  status,
}: {
  agentId: string;
  status: "active" | "paused" | "draft";
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: "ACTIVE" | "PAUSED" | "DRAFT") {
    setError(null);
    const prev = optimisticStatus;
    setOptimisticStatus(next === "ACTIVE" ? "active" : next === "PAUSED" ? "paused" : "draft");
    startTransition(async () => {
      const result = await updateAgentStatusAction(agentId, next);
      if (!result.ok) {
        setOptimisticStatus(prev); // rollback
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button variant="outline" size="sm" href={`/agents/${agentId}/edit`}>
        <Pencil size={13} /> Edit
      </Button>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("ACTIVE")}>
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />} Deploy
      </Button>
      <Button
        variant={optimisticStatus === "active" ? "danger" : "default"}
        size="sm"
        disabled={pending}
        onClick={() => setStatus(optimisticStatus === "active" ? "PAUSED" : "ACTIVE")}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />}
        {optimisticStatus === "active" ? "Pause" : "Resume"}
      </Button>
      {error && <span className="text-xs text-err">{error}</span>}
    </div>
  );
}
