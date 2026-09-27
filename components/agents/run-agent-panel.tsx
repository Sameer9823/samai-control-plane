"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button, Mono, Panel } from "@/components/ui/primitives";
import { Send, Loader2 } from "lucide-react";

type LiveEvent = { kind: "event"; event: Record<string, unknown> & { type: string } } | { kind: "done"; runId: string; error?: string } | { kind: "error"; error: string };

function describe(event: Record<string, unknown> & { type: string }): string {
  switch (event.type) {
    case "run-started":
      return "Agent started";
    case "run-resumed":
      return "Resumed from checkpoint";
    case "text-delta":
      return "Generating response…";
    case "tool-started":
      return `Tool call: ${event.toolName}()`;
    case "tool-completed":
      return `Tool completed: ${event.toolName}${event.isError ? " (error)" : ""}`;
    case "handoff-started":
      return `Handoff: ${event.fromAgent} → ${event.toAgent}`;
    case "retry-attempted":
      return `Retry attempt ${event.attempt}`;
    case "fallback-triggered":
      return `Fallback: ${event.failedProvider} → ${event.nextProvider}`;
    case "timeout-occurred":
      return "Timeout — retrying";
    case "guardrail-triggered":
      return `Guardrail triggered (${event.stage}): ${event.reason}`;
    case "approval-requested":
      return `Approval requested: ${event.toolName}()`;
    case "approval-resolved":
      return `Approval ${event.approved ? "granted" : "denied"}`;
    case "run-completed":
      return "Completed";
    case "run-failed":
      return `Failed: ${event.error}`;
    default:
      return event.type;
  }
}

export function RunAgentPanel({ agentId }: { agentId: string }) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef("");

  async function handleRun() {
    if (!input.trim() || running) return;
    setRunning(true);
    setLines([]);
    setFinalText(null);
    setRunId(null);
    setError(null);
    bufferRef.current = "";

    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const parts = carry.split("\n");
        carry = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as LiveEvent;
          if (msg.kind === "event") {
            setLines((prev) => [...prev, describe(msg.event)]);
            if (msg.event.type === "text-delta" && typeof msg.event.textDelta === "string") {
              bufferRef.current += msg.event.textDelta;
              setFinalText(bufferRef.current);
            }
          } else if (msg.kind === "done") {
            setRunId(msg.runId);
            if (msg.error) setError(msg.error);
          } else if (msg.kind === "error") {
            setError(msg.error);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Panel className="p-4">
      <div className="mb-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask this agent something…"
          value={input}
          disabled={running}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
        />
        <Button size="sm" onClick={handleRun} disabled={running || !input.trim()}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {running ? "Running" : "Run"}
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="space-y-1.5 rounded bg-panel-2 p-3">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-ink-dim">
              <span className={i === lines.length - 1 && running ? "animate-pulseDot text-accent" : "text-ink-faint"}>●</span>
              {line}
            </div>
          ))}
        </div>
      )}

      {finalText && (
        <div className="mt-3 rounded border border-accent/20 bg-accent/5 p-3 text-[13px] text-ink">{finalText}</div>
      )}

      {error && <div className="mt-3 rounded border border-err/30 bg-err/5 p-3 text-[13px] text-err">{error}</div>}

      {runId && (
        <div className="mt-3">
          <Link href={`/runs/${runId}`} className="text-2xs text-accent hover:underline">
            View full trace (<Mono className="text-2xs">{runId}</Mono>) →
          </Link>
        </div>
      )}
    </Panel>
  );
}
