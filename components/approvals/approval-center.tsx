"use client";

import { useState, useTransition } from "react";
import { Panel, Badge, Mono, Button } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";
import type { ApprovalRequest } from "@/lib/samai/types";
import { resolveApprovalAction } from "@/app/(dashboard)/approvals/actions";

export function ApprovalCenter({ initial, canResolve }: { initial: ApprovalRequest[]; canResolve: boolean }) {
  const [approvals, setApprovals] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const pending = approvals.filter((a) => a.status === "pending");
  const history = approvals.filter((a) => a.status !== "pending");

  function resolve(id: string, approved: boolean) {
    if (!canResolve) return;
    setError(null);
    const previous = approvals;
    setPendingId(id);
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: approved ? "approved" : "rejected", resolvedAt: new Date().toISOString(), resolvedBy: "you@acme.ai" } : a))
    );
    startTransition(async () => {
      const result = await resolveApprovalAction(id, approved);
      setPendingId(null);
      if (!result.ok) {
        setApprovals(previous); // roll back the optimistic update — the server said no
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">{error}</div>
      )}
      {pending.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-sm text-ink-dim">No actions are waiting on approval right now.</p>
        </Panel>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <Panel key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">{a.agentName}</span>
                    <span className="text-ink-faint">wants to execute</span>
                    <Mono className="text-accent">{a.toolName}()</Mono>
                    <Badge variant={a.risk === "high" ? "default" : "outline"} className={a.risk === "high" ? "border-err/40 text-err" : undefined}>
                      {a.risk === "high" && <AlertTriangle size={10} className="mr-0.5" />}
                      {a.risk} risk
                    </Badge>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-panel-2 px-3 py-2 font-mono-data text-[12px] text-ink-dim">
{JSON.stringify(a.args, null, 2)}
                  </pre>
                  <p className="mt-2 text-xs text-ink-dim">{a.reason}</p>
                  <p className="mt-1 text-2xs text-ink-faint">{timeAgo(a.timestamp)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canResolve ? (
                    <>
                      <Button size="sm" disabled={pendingId === a.id} onClick={() => resolve(a.id, true)}>
                        {pendingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                      </Button>
                      <Button size="sm" variant="danger" disabled={pendingId === a.id} onClick={() => resolve(a.id, false)}>
                        {pendingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Reject
                      </Button>
                    </>
                  ) : (
                    <Badge>view only</Badge>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-[13px] font-medium text-ink">History</h2>
      <div className="space-y-1.5">
        {history.map((a) => (
          <Panel key={a.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className={a.status === "approved" ? "text-ok" : "text-err"}>{a.status === "approved" ? "Approved" : "Rejected"}</span>
              <span className="text-ink-faint">—</span>
              <span className="text-ink">{a.agentName}</span>
              <Mono className="text-ink-dim">{a.toolName}()</Mono>
            </div>
            <span className="text-2xs text-ink-faint">
              {a.resolvedBy} · {a.resolvedAt ? timeAgo(a.resolvedAt) : ""}
            </span>
          </Panel>
        ))}
      </div>
    </div>
  );
}
