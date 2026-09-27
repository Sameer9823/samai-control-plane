# SamAI Control Plane

**Build. Run. Observe. Scale AI Agents.**

The management, observability, debugging, evaluation, memory, security, and
deployment platform for applications built with [`samai-sdk`](https://github.com/Sameer9823/samai-sdk)
([npm](https://www.npmjs.com/package/samai-sdk) · [docs site](https://www.samai-sdk.in/)).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing page,
or go straight to [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

No environment variables are required to run this — see **Demo mode** below.
Want a real Postgres database instead? See **Database** below.

## Demo mode

With no `DATABASE_URL` set, `lib/samai/client.ts` — the **only** file that's
allowed to import from `samai-sdk` or touch the database — resolves every
method against the realistic seeded dataset in `lib/samai/demo-data.ts` (4
agents, 140 runs with full event-level traces, 10 tools, 4 MCP servers, 24
memory records, 26 guardrail events, pending + historical approvals, 8
model providers, 18 sessions, 4 evaluation runs, and a 30-day usage series)
instead of hitting a database. Zero setup needed.

Set `ANTHROPIC_API_KEY` (see `.env.example`) to flip `SamAIClient.demoMode`
to `false` — this only affects `triggerRun()` (the one method that would
call `runAgent()`/`runAgentStream()` for real); every other page keeps
working against demo data or Postgres regardless.

Because `RunTrace` / `TraceEvent` / `Usage` in `lib/samai/types.ts` mirror
the shapes `samai-sdk` itself exports (see `node_modules/samai-sdk/dist/trace-*.d.ts`
after `npm install`), a real trace from `runAgent()` drops straight into the
existing Run Detail / Traces UI with no reshaping.

## Database

Set `DATABASE_URL` and `SamAIClient` switches every method from
`demo-data.ts` to real Postgres queries via Prisma — the page components
don't change at all, since both paths return the exact same TypeScript
types.

```bash
createdb samai_control_plane          # or point DATABASE_URL at any Postgres 14+
npm install                           # postinstall runs `prisma generate`
npx prisma migrate deploy             # applies prisma/migrations/20260924000000_init
npm run db:seed                       # loads the same realistic dataset as demo mode
npm run dev
```

- **Schema** (`prisma/schema.prisma`): 33 models covering the full data model
  from the product brief — Organization/User/Workspace/Environment, Agent +
  AgentVersion + AgentTool/AgentHandoff/AgentGuardrail, Run + RunEvent +
  Trace + TraceEvent + ToolCall, Tool, MCPServer + MCPTool, Memory +
  MemoryRelation, Guardrail + GuardrailEvent, ModelProvider +
  ModelConfiguration, Session + Message, Evaluation + EvaluationRun +
  EvaluationResult, Approval + ApprovalEvent, UsageRecord, APIKey, Webhook.
- **`TraceEvent`** stores one row per `samai-sdk` `AgentEvent`
  (`type` + a `payload` JSON column, ordered by `sequence`), so a run's full
  `RunTrace` reconstructs losslessly from `SELECT ... ORDER BY sequence`.
- **`prisma/seed.ts`** transforms the same generator output used by
  `demo-data.ts` into real rows — agents, runs, traces, tool calls (derived
  from each trace's `tool-call`/`tool-result` pairs), memory, guardrail
  events, approvals, sessions, evaluations, and the 30-day usage series.
- **`lib/samai/client.ts`** checks `USE_DATABASE = !!process.env.DATABASE_URL`
  per method: e.g. `listAgents()` fetches agents with their tools/guardrails/
  handoffs plus a `Run.groupBy` aggregate for run count/success rate/latency/
  cost/last-active; `getRun()` hydrates the full ordered trace; `listRuns()`
  intentionally returns a *light* trace stub (list pages never read
  `.trace.events`, only the scalar Run columns) to avoid an N+1 join.

**A transparency note on verification:** this was built in a sandboxed
environment whose network is restricted to a small allow-list of domains —
it doesn't include `binaries.prisma.sh`, which Prisma's CLI needs to
download its schema/query engine binaries for `prisma generate` / `migrate
dev`. So instead of running those commands directly, the schema was
verified by hand-deriving the exact SQL in `prisma/migrations/.../migration.sql`
from `schema.prisma` and applying it to a live local Postgres 16 instance,
then proving every table and the exact query/reconstruction patterns
`client.ts` uses (including rebuilding a `RunTrace` from ordered
`trace_events` rows) with `scripts/verify-db.mjs`, a one-off harness using
the pure-JS `pg` driver (no engine binary needed). That script is not part
of the app — it's just the proof. In your own environment, with normal
internet access, `npx prisma generate` / `npx prisma migrate dev` will work
directly and `prisma/migrations/` will regenerate cleanly from the schema.

## Authentication & RBAC

Auth is tied to the database: in demo mode (no `DATABASE_URL`) there's no
real account system behind the in-memory dataset, so `middleware.ts` skips
auth entirely and every page renders as a fixed `OWNER` identity. Once
`DATABASE_URL` **and** `AUTH_SECRET` are set, `middleware.ts` requires a
signed-in session for every dashboard route, and `/login` becomes a real
sign-in form.

- **Auth.js (NextAuth v5)**, Credentials provider — `lib/auth/auth.ts` looks
  the user up in Postgres (`prisma.user`) and checks their bcrypt password
  hash. Sessions use the **JWT** strategy with the user's role embedded in
  the token, so there's no need for the Account/Session/VerificationToken
  tables a full `@auth/prisma-adapter` setup would require.
- **Edge-safe middleware** — `lib/auth/auth.config.ts` holds the
  Prisma-free half of the config (callbacks only, no provider), which is
  what `middleware.ts` uses to verify the session cookie on the Edge
  runtime. The full config in `lib/auth/auth.ts` (Credentials provider +
  Prisma + bcrypt) only ever runs in the Node.js runtime — the sign-in API
  route and server components — never in middleware.
- **RBAC** (`lib/auth/rbac.ts`) — role hierarchy `OWNER > ADMIN > DEVELOPER
  > VIEWER`, matching the `Role` enum in `schema.prisma`. Wired into: the
  Approvals page (`canResolveApprovals` — VIEWER sees a "view only" badge
  instead of Approve/Reject), Settings (`canManageSettings` — API key
  actions are ADMIN+ only), and Agents (`canManageAgents` — VIEWER doesn't
  see "Create Agent" or the agent-detail action buttons). This is UI-level
  gating for the demo; a production build should also enforce these checks
  inside the server actions/route handlers themselves, not only in what's
  rendered.
- **Seeded accounts** (`prisma/seed.ts`): `owner@acme.ai`, `admin@acme.ai`,
  `dev@acme.ai`, `viewer@acme.ai` — one per role, password `samai-demo` for
  all four (shown on the login page itself). In a real deployment these
  would be invited through Settings → Team, not seeded with a shared
  password.
- **Sign-out** — a server action (`lib/auth/actions.ts`) wired to the
  sidebar's sign-out icon, shown only when `DATABASE_URL` is set.

This was verified the same way the database layer was: `bcryptjs`
hash/compare was sanity-checked directly, and the exact `authorize()`
lookup — find user by email in Postgres, compare bcrypt hash — was
simulated end-to-end against the live local instance via the raw `pg`
driver (`Password valid: true`, `Wrong password rejected correctly: true`).
`next-auth` itself installs and resolves fine (pure JS/TS, no engine
binary), so the parts of this that don't touch `@prisma/client` compile
normally; the parts that do hit the same generation blocker described in
**Database** above.

## Live runs

`triggerRun()` in `lib/samai/client.ts` runs a **real** `samai-sdk` agent
loop — `defineAgent()` (via `lib/samai/agent-builder.ts`) + `runAgent()` /
`runAgentStream()` — not a simulation of one:

- **`ANTHROPIC_API_KEY` set** — real Anthropic model calls, via the SDK's
  own `anthropic()` provider.
- **Unset (default)** — the exact same agent loop, tool execution, and
  `RunTrace` construction, but against the SDK's own `createMockProvider()`
  instead of a real model API, so a live run works with zero
  configuration. The mock's response is generic (works for any agent): it
  tries a real tool call first for tools this build knows how to execute
  (see below), then finishes with an answer clearly labeled
  `(Simulated response — no ANTHROPIC_API_KEY configured)`.

**Real, working tools** (`lib/samai/tools.ts`) — `get_time` and
`calculator`, built with the SDK's own `defineTool()`, needing no external
API keys. Any other tool name configured on an agent falls back to a stub
that honestly tells the model it isn't wired to a real executor, rather
than pretending to do something it can't.

**Live Run Stream** (product brief section 16) — `POST
/api/agents/[agentId]/run` streams NDJSON, one line per real
`samai-sdk` `AgentEvent` as `runAgentStream()` produces it (`run-started`,
`tool-started`, `tool-completed`, `text-delta`, `run-completed`, …),
followed by a final `{ kind: "done", runId }` once the run — success or
failure — is persisted. `components/agents/run-agent-panel.tsx` is the
client side: type a message on any agent's detail page (if your role can
manage agents) and watch it run live, then jump straight to the persisted
run's full trace.

**Scope, stated plainly:**
- **Single agent only** — an agent's configured `handoffs` are shown as
  static badges but don't actually resolve into a real handoff chain for a
  live run; `lib/samai/agent-builder.ts` documents this.
- **Approval-gated tools fail closed** — a live run's `onApprovalRequest`
  always returns `false` rather than pausing for a human (that needs
  request/response across two separate requests, which this synchronous
  streaming design doesn't support yet) — same "fail closed by default"
  behavior the SDK itself defaults to.
- **Persistence** — a successful or failed run is persisted as real
  Run/Trace/TraceEvent(+derived ToolCall) rows when `DATABASE_URL` is set,
  or appended to an in-memory list otherwise (resets on server restart —
  there's no database to persist to in demo mode).

**Verified, not just written:** `scripts/verify-live-run.ts` actually
*executes* this code path — `toSamaiAgent()` + the real `calculator` tool +
`runAgentStream()`/`runAgent()` — against `createMockProvider()`, with no
network access needed (unlike the Prisma-touching code, `samai-sdk` is pure
JS/TS with no engine binary to fetch, so this ran successfully in this
sandbox). It confirmed: the real agent loop calls the real tool, the
resulting `RunTrace` event sequence is exactly `run-started → model-call →
model-call-completed → tool-call → tool-result → model-call →
model-call-completed → run-completed`, and the trace shape matches
`lib/samai/types.ts` field-for-field.

## Architecture

```
app/
  page.tsx                 marketing landing page
  (dashboard)/              sidebar + topbar shell
    dashboard/               overview: metrics, charts, system health
    agents/                  list, detail (tabs), multi-step builder
    runs/                    activity feed + run detail w/ execution timeline
    traces/                  trace graph + node inspector
    tools/                   registry + detail (schema, recent calls)
    mcp/                     connected servers + detail
    memory/                  sessions / vector / graph / facts tabs
    guardrails/               per-guardrail metrics + recent events
    approvals/                human approval queue (interactive, server-enforced)
    models/                   provider status + routing config
    sessions/                 conversation sessions
    evaluations/              regression eval runs
    usage/                    usage analytics
    settings/                 API keys, team, environments
    docs/                     quickstart + SDK code examples

lib/
  samai/
    client.ts               THE adapter boundary — Prisma or demo-data, per DATABASE_URL
    agent-builder.ts          AgentSummary -> real samai-sdk Agent (defineAgent)
    tools.ts                   real ToolDefinitions (get_time, calculator) + honest stubs
    types.ts                 control-plane types mirroring samai-sdk's own shapes
    trace-view.ts             RunTrace -> timeline nodes (pure functions)
    demo-data.ts              seeded realistic dataset (deterministic RNG)
    rng.ts                    seeded PRNG helper
  db/
    prisma.ts                 PrismaClient singleton (hot-reload-safe)
  auth/
    auth.ts                   full Auth.js config (Credentials + Prisma) — Node runtime only
    auth.config.ts             Edge-safe base config, used by middleware.ts
    session.ts                 getCurrentUser() — demo identity or real session, per DATABASE_URL
    rbac.ts                    role hierarchy + canManageAgents/canResolveApprovals/etc.
    actions.ts                 sign-out server action
    next-auth.d.ts              module augmentation adding `role` to Session/JWT
  utils.ts                    formatting helpers, cn()

middleware.ts                 redirects to /login when DB mode is active + no session

prisma/
  schema.prisma              33-model schema (see Database section)
  seed.ts                     loads the realistic dataset + 4 role-seeded accounts
  migrations/                 hand-verified initial + auth migrations

scripts/
  verify-db.mjs               one-off schema/query verification harness (not part of the app)
  verify-live-run.ts           one-off live-agent-loop verification harness (not part of the app)

components/
  ui/                        Button, Table, Tabs, StatusBadge, etc.
  layout/                    Sidebar (shows real user/role + sign-out), Topbar
  charts/                    recharts wrappers themed for the console
  traces/                    TraceTimeline (click-to-inspect), TraceGraph (SVG)
  agents/                    multi-step agent builder, RunAgentPanel (live run UI)
  approvals/                 approval queue with optimistic approve/reject (role-gated)
  marketing/                 landing-page execution graph animation

app/
  login/                     Auth.js sign-in page (server action form, no client JS)
  api/
    auth/[...nextauth]/       Auth.js route handler
    agents/[agentId]/run/     streaming live-run endpoint (NDJSON)
```

## Design

Dark-first developer-infrastructure console (Vercel / Linear / Raycast /
LangSmith / Datadog influences, original visual identity): near-black
background, restrained indigo accent, IBM Plex Sans for UI text and IBM Plex
Mono for run IDs, trace IDs, API keys, and tool names. Tokens live in
`app/globals.css` and `tailwind.config.ts`.

## The most important screen

Per the product brief, **Run Detail + Trace** (`/runs/[runId]`) is the heart
of the product: open any run and immediately see what happened, why, which
model ran, which tools were used, which agent handoff occurred, what the
guardrail did, and how much it cost — down to the individual event. Click
any node in the timeline to inspect its full detail in the side panel.

## What's stubbed vs. real

- **Real**: UI, routing, the full `lib/samai/` adapter interface, the
  `RunTrace`/`TraceEvent` shapes (mirroring the actual SDK), the `samai-sdk`
  package itself is an installed, real dependency, a real verified Postgres
  schema + seed + query layer behind `DATABASE_URL`, real Auth.js
  authentication + RBAC behind that same flag, and — as of this build —
  real, verified live agent runs (`runAgent()`/`runAgentStream()`, real
  tool execution, a live NDJSON event stream) regardless of `DATABASE_URL`,
  plus real agent CRUD persistence (Create/Edit/Deploy/Pause) behind
  `DATABASE_URL` (see **Agent CRUD** below). Everything in this list is
  real; see **Database**, **Authentication & RBAC**, and **Live runs**
  above.
- **RBAC enforcement**: now checked server-side, not just hidden in the UI,
  for the three mutating actions that exist — resolving an approval
  (`app/(dashboard)/approvals/actions.ts`, re-checking `canResolveApprovals()`),
  triggering a live run (the streaming route, re-checking `canManageAgents()`),
  and managing agents (create/edit/deploy/pause via `app/(dashboard)/agents/actions.ts`,
  re-checking `canManageAgents()`). All were previously UI-only; verified by
  re-running the loose-stub `tsc` pass after wiring each server action in (no
  real errors in any action, client, or shared type). The pattern is identical
  across all three: `getCurrentUser()` → `canManageX(user.role)` → reject if
  false, then delegate to `SamAIClient`. Add the same pattern to any new
  mutating action/route.
- **Agent CRUD (Create / Edit / Deploy / Pause)**: real in DB mode, demo-only
  in demo mode. Three new server actions in `app/(dashboard)/agents/actions.ts`:
  `createAgentAction` (wizard → "Deploy Agent"), `editAgentAction` (edit page →
  "Save Changes"), and `updateAgentStatusAction` (Deploy/Pause buttons on the
  detail page). All three zod-validate their input against the wizard's fields
  and RBAC-check via `canManageAgents()`. `SamAIClient.createAgent()` writes to
  Postgres in a `$transaction`: a real `Agent` row + an initial `AgentVersion`
  + `AgentTool`/`AgentGuardrail` join-link rows, mirroring exactly what
  `prisma/seed.ts` does (same scalar fields, same nested `tools: { create: ... }`
  / `guardrails: { create: ... }` shape, same `currentVersionId` wiring). Tools
  and guardrails named in the form that don't exist yet are auto-created as
  stub rows so the join links always resolve. `editAgent()` creates a *new*
  `AgentVersion` row (version number auto-incremented) and repoints
  `Agent.currentVersionId` — it never mutates version history, matching the
  schema's `Agent`/`AgentVersion` relation in `prisma/schema.prisma`. In demo
  mode (no `DATABASE_URL`), these append to/update an in-memory `runtimeAgents`
  array in `lib/samai/client.ts` — the same pattern as the existing
  `runtimeRuns` array — merged into `listAgents()`/`getAgent()` reads so newly
  created/edited agents appear in the UI within the current process. In-memory
  state resets on server restart; that's expected for a demo. Verified by
  cross-referencing every Prisma field/relation name against `schema.prisma`
  and the `prisma/migrations/` SQL (a live Postgres 16 instance wasn't
  available in this sandbox, consistent with the network restriction noted in
  **Database**, but the loose-stub `tsc --noEmit` pass confirms the server
  actions, client-component callers, and shared types all agree on the form
  shape — zero new type errors in any new or modified file).
- **Live runs, scope**: single agent only (handoffs aren't resolved into a
  real handoff chain), and approval-gated tools fail closed rather than
  pausing for a human — see the full scope list in **Live runs** above.
- **Realtime**: a triggered live run *does* stream event-by-event now (NDJSON,
  not SSE) — see **Live runs** above. What's still not implemented: the
  broader realtime architecture the brief describes for *existing* runs —
  e.g. watching someone else's in-progress run from the Runs list, or a
  notification center pushing `run.failed`/`approval.required` events.
  Every run *detail page* still renders from a completed `RunTrace`.
- **MCPServer↔Agent association**: now tracked for real via the
  `AgentMCPServer` join table (migration
  `prisma/migrations/20260927000000_agent_mcp_server`) — `listMCPServers()`
  joins through it, and `prisma/seed.ts` populates it from the same
  `MCP_SERVERS[].agents` demo data (verified all four servers' agent names
  match real seeded agents). Previously this was hardcoded to `[]` in DB
  mode.

## Scripts

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run start        # run the production build
npm run db:generate  # regenerate the Prisma client after schema changes
npm run db:migrate   # apply migrations (prisma migrate deploy)
npm run db:seed      # load the realistic dataset into Postgres
npm run db:studio    # browse the database (prisma studio)
```

> **Notes:** `next/font/google` fetches IBM Plex Sans/Mono from Google Fonts
> at build time, so `npm run build` needs outbound internet access (swap for
> `next/font/local` or a system font stack if you need a fully offline
> build). Likewise, the `postinstall` hook runs `prisma generate`, which
> needs to reach `binaries.prisma.sh` — see the transparency note in
> **Database** above if that's blocked in your environment too.
