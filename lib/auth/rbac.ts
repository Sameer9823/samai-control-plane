/**
 * lib/auth/rbac.ts
 * ---------------------------------------------------------------------------
 * Role hierarchy: OWNER > ADMIN > DEVELOPER > VIEWER (matches the `Role`
 * enum in prisma/schema.prisma). Pure functions only — no server-only
 * import — so these can run in both server components and the client
 * components that need to hide/disable actions (e.g. the Approve/Reject
 * buttons in components/approvals/approval-center.tsx).
 */
export type Role = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";

const RANK: Record<Role, number> = { OWNER: 3, ADMIN: 2, DEVELOPER: 1, VIEWER: 0 };

function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/** Approve/reject a pending approval-gated tool call. */
export function canResolveApprovals(role: Role): boolean {
  return atLeast(role, "DEVELOPER");
}

/** Create, edit, deploy, or pause an agent. */
export function canManageAgents(role: Role): boolean {
  return atLeast(role, "DEVELOPER");
}

/** Create/rotate/revoke API keys, manage team, environments. */
export function canManageSettings(role: Role): boolean {
  return atLeast(role, "ADMIN");
}

/** Invite/remove team members, change someone else's role. */
export function canManageTeam(role: Role): boolean {
  return atLeast(role, "OWNER");
}

export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
