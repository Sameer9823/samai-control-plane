"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "relative -mb-px px-3 py-2 text-[13px] transition-colors",
              active === t.key ? "text-ink" : "text-ink-dim hover:text-ink"
            )}
          >
            {t.label}
            {active === t.key && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-accent" />}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
