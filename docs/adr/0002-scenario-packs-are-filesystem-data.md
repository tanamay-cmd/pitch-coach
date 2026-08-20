# 0002. Scenario packs are read from the filesystem at request time

- **Status:** Accepted
- **Date:** 2026-08-20
- **Deciders:** Project owner, Claude

## Context

[ADR-0001](0001-prep-pipeline-runs-in-claude-code.md) puts generated scenarios in
`scenarios/<id>/pack.json`. The app has to get them into the browser, and the packs are
written by an agent — so they can be malformed in ways hand-written code is not.

The built-in packs in `src/lib/packs.ts` are TypeScript, checked by the compiler. Generated
packs get no such guarantee.

## Decision drivers

- The generate-then-practise loop should be tight. Running `/prep` and then restarting a
  server or rebuilding to see the result is friction in the main workflow.
- A malformed pack must not take down the packs list, and must say what is wrong.
- The deployed app should show the same packs as local — the repo is the source of truth.
- No new dependencies for something this small.

## Considered options

1. **Static import at build time** — generate a TypeScript index importing every `pack.json`.
2. **`fs` read at request time** behind `/api/scenarios`.
3. **Copy packs into `public/`** and fetch them as static assets.

### Option 1 — Static import
- 👍 Type-checked at build; zero runtime cost.
- 👎 A new scenario needs a rebuild, and a codegen step to maintain.
- 👎 A malformed pack breaks the build for every scenario, not just itself.

### Option 2 — `fs` at request time
- 👍 Drop a folder in, reload, it is there. No rebuild, no restart.
- 👍 Per-scenario validation: one bad pack is skipped, the rest load.
- 👎 Nothing imports the files, so Next's static tracing cannot see them and they are absent
  from a serverless bundle unless told otherwise.
- 👎 Validation has to be hand-written.

### Option 3 — Static assets in `public/`
- 👍 No server code.
- 👎 A copy step, so `scenarios/` and `public/` drift.
- 👎 Validation lands in the browser, after the bad data has already shipped.

## Decision

**Option 2.** [`/api/scenarios`](../../src/app/api/scenarios/route.ts) reads the directory with
`fs` on each request and returns `{ packs, skipped }`.

Two consequences handled explicitly:

- **Bundling.** `outputFileTracingIncludes` in `next.config.ts` forces `scenarios/**/*.json`
  into the `/api/scenarios` bundle. Without it a deployed instance silently shows only the
  built-in packs — the worst kind of failure, because it looks like it worked.
- **Validation.** [`src/lib/scenarios.ts`](../../src/lib/scenarios.ts) checks every field and
  throws with the offending path (`briefing.rubric[0].weight must be high|medium|low`). A
  scenario that fails is returned in `skipped` with its reason and rendered in the Knowledge
  tab, so a bad pack is visible rather than absent. A folder with no `pack.json` yet — phase 1
  done, phase 2 not — gets its own message rather than an error.

`pack.json` is the source of truth. `briefing.md` is the same content rendered for reading on
GitHub; the app renders from the JSON, so the JSON is what you are practising against.

## Consequences

- Generate a scenario and reload — that is the whole loop.
- Validation logic is duplicated in spirit by `agents/pack.schema.json`, which documents the
  contract for the agent. They must be kept in step; the schema is the human-facing statement,
  the loader is the enforced one. `npx ajv-cli validate -s agents/pack.schema.json -d
  "scenarios/*/pack.json" --spec=draft2020` checks a pack against the schema.
- Reading from disk on every request is a non-issue at this scale, and the alternative — a
  cache — would reintroduce the staleness this was chosen to avoid.
- If scenario count ever grows past a few dozen, this wants a cache with a mtime check. It does
  not want one now.
