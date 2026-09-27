"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Bot,
  Play,
  Waypoints,
  Wrench,
  Plug,
  BrainCircuit,
  ShieldCheck,
  Cpu,
  MessagesSquare,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  Settings,
  BookOpen,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/runs", label: "Runs", icon: Play },
  { href: "/traces", label: "Traces", icon: Waypoints },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/mcp", label: "MCP", icon: Plug },
  { href: "/memory", label: "Memory", icon: BrainCircuit },
  { href: "/guardrails", label: "Guardrails", icon: ShieldCheck },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/sessions", label: "Sessions", icon: MessagesSquare },
  { href: "/evaluations", label: "Evaluations", icon: FlaskConical },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/usage", label: "Usage", icon: Gauge },
];

export function Sidebar({ user, showSignOut }: { user: { name: string; role: string }; showSignOut: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-border bg-panel md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
          <span className="font-mono-data text-[11px] font-bold text-white">S</span>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-ink">SamAI</span>
        <span className="ml-auto rounded border border-border-strong px-1.5 py-0.5 text-2xs text-ink-faint">Control Plane</span>
      </div>

      <button className="mx-3 mt-3 flex items-center justify-between rounded border border-border-strong bg-panel-2 px-2.5 py-2 text-left hover:border-ink-faint">
        <div className="min-w-0">
          <div className="text-2xs text-ink-faint">Workspace</div>
          <div className="truncate text-[13px] font-medium text-ink">Acme AI</div>
        </div>
        <ChevronsUpDown size={14} className="shrink-0 text-ink-faint" />
      </button>

      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors",
                active ? "bg-accent/12 text-ink font-medium" : "text-ink-dim hover:bg-panel-2 hover:text-ink"
              )}
            >
              <Icon size={15} className={cn(active ? "text-accent" : "text-ink-faint")} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-3">
        <Link href="/docs" className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] text-ink-dim hover:bg-panel-2 hover:text-ink">
          <BookOpen size={15} className="text-ink-faint" />
          Documentation
        </Link>
        <Link href="/settings" className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] text-ink-dim hover:bg-panel-2 hover:text-ink">
          <Settings size={15} className="text-ink-faint" />
          Settings
        </Link>
        <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-panel-2 text-2xs font-medium text-ink-dim">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-ink">{user.name}</div>
            <div className="truncate text-2xs capitalize text-ink-faint">{user.role.toLowerCase()}</div>
          </div>
          {showSignOut && (
            <form action={signOutAction}>
              <button type="submit" title="Sign out" className="text-ink-faint hover:text-ink">
                <LogOut size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
