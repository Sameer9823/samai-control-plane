"use client";

import { useState } from "react";
import { Search, Bell, Github, BookOpen, ChevronDown, Command } from "lucide-react";
import { cn } from "@/lib/utils";

const ENVS = ["Production", "Staging", "Development"];

export function Topbar() {
  const [env, setEnv] = useState("Production");
  const [envOpen, setEnvOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur">
      <button className="flex h-8 flex-1 max-w-sm items-center gap-2 rounded border border-border-strong bg-panel px-2.5 text-ink-faint hover:border-ink-faint">
        <Search size={14} />
        <span className="text-[13px]">Search agents, runs, traces…</span>
        <span className="ml-auto flex items-center gap-0.5 rounded border border-border-strong bg-panel-2 px-1 py-0.5 text-2xs">
          <Command size={10} />K
        </span>
      </button>

      <div className="relative ml-auto">
        <button
          onClick={() => setEnvOpen((v) => !v)}
          className="flex h-8 items-center gap-1.5 rounded border border-border-strong bg-panel px-2.5 text-[13px] text-ink hover:border-ink-faint"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", env === "Production" ? "bg-ok" : env === "Staging" ? "bg-warn" : "bg-info")} />
          {env}
          <ChevronDown size={13} className="text-ink-faint" />
        </button>
        {envOpen && (
          <div className="absolute right-0 top-9 w-40 rounded border border-border-strong bg-panel-2 p-1 shadow-lg">
            {ENVS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setEnv(e);
                  setEnvOpen(false);
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-[13px] text-ink hover:bg-panel"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="flex h-8 w-8 items-center justify-center rounded border border-border-strong bg-panel text-ink-dim hover:border-ink-faint">
        <BookOpen size={15} />
      </button>
      <a href="https://github.com/Sameer9823/samai-sdk" target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded border border-border-strong bg-panel text-ink-dim hover:border-ink-faint">
        <Github size={15} />
      </a>
      <button className="relative flex h-8 w-8 items-center justify-center rounded border border-border-strong bg-panel text-ink-dim hover:border-ink-faint">
        <Bell size={15} />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
      </button>
    </header>
  );
}
