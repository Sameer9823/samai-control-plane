"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, Badge, Mono } from "@/components/ui/primitives";
import { Check, Loader2 } from "lucide-react";
import type { AgentSummary, AgentFormInput } from "@/lib/samai/types";
import { createAgentAction, editAgentAction } from "@/app/(dashboard)/agents/actions";

const STEPS = ["Basic Info", "Model", "Instructions", "Tools", "Memory", "Guardrails", "Review"];

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic", models: ["claude-sonnet-4-6", "claude-haiku-4-5"] },
  { id: "openai", label: "OpenAI", models: ["gpt-4.1", "gpt-4.1-mini"] },
  { id: "google", label: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  { id: "groq", label: "Groq", models: ["llama-3.1-70b"] },
  { id: "mistral", label: "Mistral", models: ["mistral-large-latest"] },
  { id: "ollama", label: "Ollama", models: ["llama3.1"] },
  { id: "azure", label: "Azure OpenAI", models: ["gpt-4.1-deployment"] },
  { id: "bedrock", label: "AWS Bedrock", models: ["anthropic.claude-sonnet-4-6"] },
];

const AVAILABLE_TOOLS = ["web_search", "http_request", "database_query", "code_execution", "file_search", "custom_tool", "mcp"];
const ENVIRONMENTS = ["development", "staging", "production"] as const;
const MEMORY_OPTIONS = ["none", "session", "vector", "graph", "hybrid"] as const;
const GUARDRAIL_OPTIONS = ["PII", "Prompt Injection", "Budget", "Schema", "Dangerous Tool", "Custom"];

export function AgentBuilder({ mode = "create", agentId, initialData }: { mode?: "create" | "edit"; agentId?: string; initialData?: AgentSummary }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AgentFormInput>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    environment: initialData?.environment ?? "development",
    provider: initialData?.provider ?? "anthropic",
    model: initialData?.model ?? "claude-sonnet-4-6",
    temperature: initialData?.temperature ?? 0.4,
    maxTokens: initialData?.maxTokens ?? 4096,
    instructions: initialData?.instructions ?? "",
    tools: initialData?.tools ?? [],
    memory: initialData?.memory ?? "session",
    guardrails: initialData?.guardrails ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    startTransition(async () => {
      if (mode === "edit" && agentId) {
        const result = await editAgentAction(agentId, form);
        setIsSubmitting(false);
        if (!result.ok) {
          setError(result.error);
        } else {
          router.push(`/agents/${agentId}`);
        }
      } else {
        const result = await createAgentAction(form);
        setIsSubmitting(false);
        if (!result.ok) {
          setError(result.error);
        } else {
          router.push(`/agents/${result.agentId}`);
        }
      }
    });
  }

  const providerModels = PROVIDERS.find((p) => p.id === form.provider)?.models ?? [];
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div>
      {/* stepper */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium",
                i === step ? "border-accent bg-accent/10 text-accent" : i < step ? "border-border-strong bg-panel-2 text-ink-dim" : "border-border text-ink-faint"
              )}
            >
              {i < step ? <Check size={11} /> : <span className="font-mono-data">{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border-strong" />}
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-panel p-5">
        {step === 0 && (
          <div className="max-w-md space-y-4">
            <Field label="Name">
              <input
                className="input"
                placeholder="e.g. Onboarding Agent"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="input min-h-20"
                placeholder="What does this agent do?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Environment">
              <div className="flex gap-2">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env}
                    onClick={() => setForm({ ...form, environment: env })}
                    className={cn(
                      "rounded border px-2.5 py-1 text-[13px] capitalize",
                      form.environment === env ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim"
                    )}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-md space-y-4">
            <Field label="Provider">
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, provider: p.id, model: p.models[0] })}
                    className={cn(
                      "rounded border px-2.5 py-1.5 text-left text-[13px]",
                      form.provider === p.id ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Model">
              <select className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                {providerModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Temperature — ${form.temperature}`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                className="w-full accent-[hsl(238,84%,67%)]"
              />
            </Field>
            <Field label="Max tokens">
              <input
                type="number"
                className="input"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <Field label="Instructions">
            <textarea
              className="input min-h-48 font-mono-data text-[12.5px]"
              placeholder="You are a helpful assistant that..."
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />
          </Field>
        )}

        {step === 3 && (
          <Field label="Available tools">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOOLS.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, tools: toggle(form.tools, t) })}
                  className={cn(
                    "rounded border px-2.5 py-1 font-mono-data text-[12.5px]",
                    form.tools.includes(t) ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        )}

        {step === 4 && (
          <Field label="Memory strategy">
            <div className="flex flex-wrap gap-2">
              {MEMORY_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, memory: m })}
                  className={cn(
                    "rounded border px-2.5 py-1 text-[13px] capitalize",
                    form.memory === m ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
        )}

        {step === 5 && (
          <Field label="Guardrails">
            <div className="flex flex-wrap gap-2">
              {GUARDRAIL_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setForm({ ...form, guardrails: toggle(form.guardrails, g) })}
                  className={cn(
                    "rounded border px-2.5 py-1 text-[13px]",
                    form.guardrails.includes(g) ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-ink-dim"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-dim">Review the final configuration before deploying.</p>
            <pre className="overflow-x-auto rounded bg-panel-2 p-3 font-mono-data text-[12.5px] leading-relaxed text-ink-dim">
{JSON.stringify(form, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-1.5">
              {form.tools.map((t) => (
                <Badge key={t}><Mono>{t}</Mono></Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
            {mode === "edit" ? "Save Changes" : "Deploy Agent"}
          </Button>
        )}
      </div>

      {error && <div className="mt-3 rounded border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">{error}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-2xs uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </label>
  );
}
