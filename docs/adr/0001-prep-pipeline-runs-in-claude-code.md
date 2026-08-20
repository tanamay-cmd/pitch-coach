# 0001. The scenario prep pipeline runs in Claude Code, not in the web app

- **Status:** Accepted
- **Date:** 2026-08-20
- **Deciders:** Project owner, Claude

## Context

Pitch Coach could generate questions for any topic, but it had no idea what a *specific* round
actually is. Practising "system design interview at Amazon" against the app's generic
interview rubric scores the wrong things: it rewards STAR structure in a round where Amazon
publishes six different objectives and weights reliability above scale.

Closing that gap needs research — the company's published guidance, candidate reports,
interviewer write-ups — turned into a rubric and a question set. That is agentic work: search,
fetch, read, cross-check, synthesise, write files.

The app already talks to the Anthropic API for questions and coaching, so putting the research
there was the obvious first thought. The owner ruled it out directly: *"all the ai work will
be done in the claude code, so no need to configure the api key part, leave what already is
done."* The app's existing key handling stays exactly as it is; no new key configuration, no
new in-app API surface.

## Decision drivers

- The owner's explicit constraint: research happens in Claude Code, the app is left alone.
- Research needs web search and fetch. The app has neither, and adding them means a tool loop,
  `pause_turn` handling, and a multi-minute request behind a 60-second serverless ceiling.
- The pipeline runs a handful of times ever, not per user per session. Building live
  infrastructure for it would be paying a permanent cost for an occasional job.
- Anyone cloning the repo should be able to generate their own scenarios, not just read the
  ones already there.
- Research fails quietly and badly — a fabricated citation reads exactly like a real one. The
  output needs to be inspectable before anyone practises against it.

## Considered options

1. **In-app agent pipeline** — a `research` action on `/api/coach` with the `web_search` server
   tool, orchestrated from the browser across several requests.
2. **Claude Code pipeline writing files into the repo** — three agent briefs in `agents/`, run
   by a `/prep` command, writing `scenarios/<id>/`.
3. **Hand-written scenario packs** — no agents; a human writes each pack.

### Option 1 — In-app agent pipeline
- 👍 One artefact; nothing to install; works for anyone with the URL.
- 👎 Contradicts the owner's constraint.
- 👎 Research plus synthesis exceeds 60s, the Vercel Hobby ceiling, so the loop has to be split
  across requests with history shuttled back and forth.
- 👎 Structured outputs plus the web search tool in one call is an untested combination here;
  splitting into research-then-synthesise calls is more code again.
- 👎 The dossier is ephemeral. Nobody can check whether a source was real.

### Option 2 — Claude Code pipeline writing files
- 👍 Satisfies the constraint exactly; the app gains a reader, not an agent.
- 👎 Requires Claude Code to generate a scenario. Reading one needs nothing.
- 👍 Every phase leaves an artefact on disk — `research.md` is reviewable and diffable, so a
  fabricated source is visible in code review rather than invisible in a response stream.
- 👍 No timeout ceiling; the research agent can take as long as it needs.
- 👍 Scenarios are versioned with the code and shareable through the repo.

### Option 3 — Hand-written packs
- 👍 No machinery at all.
- 👎 Hours of research per scenario, which is the work being automated.
- 👎 No reason to trust the rubric more than the generic one it replaces.

## Decision

**Option 2.** The pipeline is three briefs in [`agents/`](../../agents/) run in order by
[`/prep`](../../.claude/commands/prep.md), writing `scenarios/<id>/{research.md, briefing.md,
pack.json}`. The app reads those files and knows nothing about how they were made.

Three phases rather than one because they fail differently: research fails by inventing
sources, briefing by producing advice that would fit any interview anywhere, questions by
being unanswerable out loud. Separate artefacts make each failure visible in its own file.

**A consequence worth naming:** the baseline working agreement says `.claude/` is never
committed, because it holds AI working notes. `.claude/commands/prep.md` is committed anyway —
it is the product's entry point, not a note about how we work, and a clone without it cannot
generate scenarios. `.gitignore` keeps the rule and carves out only `commands/`:

```
CLAUDE.md
.claude/*
!.claude/commands/
```

The substance lives in `agents/`; the committed command is a thin pointer to it, so the
carve-out stays small.

## Consequences

- The app's API key handling is untouched, as instructed.
- Generating a scenario requires Claude Code. Using one requires only `npm run dev`.
- `research.md` is committed alongside the pack, so the evidence behind a rubric can be audited
  and a stale one can be re-run.
- Nothing prevents a hand-written `pack.json`; the schema is the only contract.
- If the pipeline is ever wanted in-browser, this is reversible — the app reads packs from an
  endpoint already, so an in-app generator would write to the same shape.
