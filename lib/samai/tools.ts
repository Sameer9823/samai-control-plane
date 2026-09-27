/**
 * lib/samai/tools.ts
 * ---------------------------------------------------------------------------
 * A small registry of REAL `samai-sdk` `ToolDefinition`s — built with the
 * SDK's own `defineTool()`, executed by the SDK's own agent loop, not
 * anything hand-simulated. Kept deliberately dependency-free (no external
 * API keys needed) so a live run works out of the box: `get_time` and
 * `calculator`. Tool names configured on an Agent that aren't in this map
 * fall back to `stubTool()`, which tells the model (truthfully) that the
 * tool isn't wired to a real executor in this build, rather than silently
 * pretending to do something it can't.
 *
 * To wire up `web_search` for real, replace its stub entry with
 * `createWebSearchTool({ provider: yourWebSearchProvider })` from
 * `samai-sdk` — it already exists in the SDK, it just needs a
 * `WebSearchProvider` implementation (e.g. Tavily) and an API key this
 * build doesn't have configured.
 */
import { defineTool, type ToolDefinition } from "samai-sdk";
import { z } from "zod";

const getTime = defineTool({
  name: "get_time",
  description: "Returns the current date and time in UTC.",
  parameters: z.object({}),
  execute: () => ({ iso: new Date().toISOString() }),
});

const calculator = defineTool({
  name: "calculator",
  description: "Evaluates a basic arithmetic expression, e.g. \"12 * (4 + 1)\".",
  parameters: z.object({ expression: z.string() }),
  execute: ({ expression }) => {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return { error: "Expression contains characters other than numbers and + - * / ( )." };
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression});`)();
      return { result };
    } catch {
      return { error: "Could not evaluate that expression." };
    }
  },
});

function stubTool(name: string): ToolDefinition {
  return defineTool({
    name,
    description: `${name} (not wired to a real executor in this demo build)`,
    parameters: z.object({}).passthrough(),
    execute: () => ({
      note: `"${name}" isn't wired to a real executor in this build. Add it to lib/samai/tools.ts to make it real.`,
    }),
  });
}

const REAL_TOOLS: Record<string, ToolDefinition> = {
  get_time: getTime,
  calculator: calculator,
};

/** Resolves configured tool names to real ToolDefinitions, stubbing anything not in the registry above. */
export function resolveTools(names: string[]): ToolDefinition[] {
  return names.map((name) => REAL_TOOLS[name] ?? stubTool(name));
}
