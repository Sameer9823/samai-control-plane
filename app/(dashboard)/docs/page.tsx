import { PageHeader, Panel } from "@/components/ui/primitives";

const SECTIONS = [
  "Quickstart", "Agents", "Tools", "Handoffs", "Memory", "Guardrails", "MCP", "Voice", "Tracing", "Streaming", "Sessions", "Evaluations",
];

const QUICKSTART = `import { createClient, anthropic, defineTool } from "samai-sdk";
import { z } from "zod";

const getWeather = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 28, condition: "sunny" }),
});

const client = createClient({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const result = await client.generate({
  model: "claude-sonnet-4-6",
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "What's the weather in Chennai?" }],
  tools: [getWeather],
  maxToolRoundtrips: 2,
});

console.log(result.text);`;

export default function DocsPage() {
  return (
    <div>
      <PageHeader title="Documentation" subtitle="Build agents with samai-sdk, then operate them from this Control Plane." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1 text-[13px] text-ink-dim">
          {SECTIONS.map((s) => (
            <div key={s} className="rounded px-2 py-1.5 hover:bg-panel-2 hover:text-ink">
              {s}
            </div>
          ))}
        </nav>

        <div>
          <Panel className="p-5">
            <h2 className="mb-1 text-[15px] font-medium text-ink">Quickstart</h2>
            <p className="mb-3 text-[13px] text-ink-dim">Install the SDK and make your first tool-calling generation.</p>
            <pre className="overflow-x-auto rounded bg-panel-2 p-4 font-mono-data text-[12.5px] leading-relaxed text-ink-dim">{QUICKSTART}</pre>
            <p className="mt-4 text-[13px] text-ink-dim">
              Full API reference, provider setup, and every runtime primitive (handoffs, guardrails, approval gates, tracing) live in the{" "}
              <a href="https://github.com/Sameer9823/samai-sdk" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                samai-sdk repository
              </a>
              .
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
