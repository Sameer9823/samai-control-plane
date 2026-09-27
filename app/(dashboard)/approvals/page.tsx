import { SamAIClient } from "@/lib/samai/client";
import { PageHeader } from "@/components/ui/primitives";
import { ApprovalCenter } from "@/components/approvals/approval-center";
import { getCurrentUser } from "@/lib/auth/session";
import { canResolveApprovals } from "@/lib/auth/rbac";

export default async function ApprovalsPage() {
  const [approvals, user] = await Promise.all([SamAIClient.listApprovals(), getCurrentUser()]);
  const canResolve = user ? canResolveApprovals(user.role) : false;
  return (
    <div>
      <PageHeader title="Human Approvals" subtitle="Approval-gated tool calls pause here until a human signs off." />
      <ApprovalCenter initial={approvals} canResolve={canResolve} />
    </div>
  );
}
