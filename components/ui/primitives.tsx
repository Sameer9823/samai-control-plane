import { cn } from "@/lib/utils";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-md border border-border bg-panel", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

const statusMap: Record<string, { dot: string; label?: string }> = {
  active: { dot: "bg-ok" },
  operational: { dot: "bg-ok" },
  connected: { dot: "bg-ok" },
  success: { dot: "bg-ok" },
  approved: { dot: "bg-ok" },
  allowed: { dot: "bg-ok" },
  running: { dot: "bg-info" },
  connecting: { dot: "bg-info" },
  waiting_approval: { dot: "bg-warn", label: "Waiting" },
  warned: { dot: "bg-warn" },
  redacted: { dot: "bg-warn" },
  degraded: { dot: "bg-warn" },
  paused: { dot: "bg-warn" },
  pending: { dot: "bg-warn" },
  draft: { dot: "bg-ink-faint" },
  disabled: { dot: "bg-ink-faint" },
  cancelled: { dot: "bg-ink-faint" },
  failed: { dot: "bg-err" },
  error: { dot: "bg-err" },
  down: { dot: "bg-err" },
  rejected: { dot: "bg-err" },
  blocked: { dot: "bg-err" },
};

export function StatusDot({ status, pulse = false }: { status: string; pulse?: boolean }) {
  const s = statusMap[status] ?? { dot: "bg-ink-faint" };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", s.dot, pulse && "animate-pulseDot")} />;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = statusMap[status] ?? { dot: "bg-ink-faint" };
  const label = s.label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-border-strong bg-panel-2 px-2 py-0.5 text-2xs font-medium capitalize text-ink-dim",
        className
      )}
    >
      <StatusDot status={status} pulse={status === "running" || status === "connecting"} />
      {label}
    </span>
  );
}

export function Badge({ children, className, variant = "default" }: { children: React.ReactNode; className?: string; variant?: "default" | "accent" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-2xs font-medium",
        variant === "default" && "border-border-strong bg-panel-2 text-ink-dim",
        variant === "accent" && "border-accent/30 bg-accent/10 text-accent",
        variant === "outline" && "border-border text-ink-dim",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono-data text-[13px]", className)}>{children}</span>;
}

export function Button({
  children,
  className,
  variant = "default",
  size = "md",
  href,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded border font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
    size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
    variant === "default" && "border-accent/40 bg-accent text-white hover:bg-accent/90",
    variant === "outline" && "border-border-strong bg-panel-2 text-ink hover:border-ink-faint",
    variant === "ghost" && "border-transparent text-ink-dim hover:bg-panel-2 hover:text-ink",
    variant === "danger" && "border-err/40 bg-err/10 text-err hover:bg-err/20",
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  deltaGood = true,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
  icon?: LucideIcon;
}) {
  const positive = delta?.startsWith("+");
  const good = positive === deltaGood;
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-dim">{label}</span>
        {Icon && <Icon size={14} className="text-ink-faint" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono-data text-2xl font-medium text-ink">{value}</span>
        {delta && (
          <span className={cn("flex items-center gap-0.5 text-2xs font-medium", good ? "text-ok" : "text-err")}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta}
          </span>
        )}
      </div>
    </Panel>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-dim">{description}</p>
      {action}
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border", className)}>
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-border bg-panel-2 px-3 py-2 text-2xs font-medium uppercase tracking-wide text-ink-faint", className)}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-border px-3 py-2.5 align-middle text-ink", className)} {...rest}>
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-panel-2/60 transition-colors", className)}>{children}</tr>;
}
