# Prep agents

Three agents that turn a sentence — *"system design interview at Amazon"* — into a practice
pack grounded in what that round actually is, plus a report explaining it to you before you
open the camera.

They run in **Claude Code**, not in the web app. The app has no research capability and no
API key requirement for this; it just reads what the agents wrote to disk.

```
  you ──▶ /prep system design interview at Amazon
                    │
   phase 1          ▼
   RESEARCH   ┌─────────────┐   web search + fetch
              │ 01-research │──────────────────────▶ scenarios/<id>/research.md
              └─────────────┘   the dossier, with every claim sourced
                    │
   phase 2          ▼
   BRIEFING   ┌─────────────┐
              │ 02-briefing │──────────────────────▶ scenarios/<id>/briefing.md
              └─────────────┘   why they ask, the rubric, good vs bad, the traps
                    │
   phase 3          ▼
   QUESTIONS  ┌─────────────┐
              │03-questions │──────────────────────▶ scenarios/<id>/pack.json
              └─────────────┘   the practice pack the app loads
                    │
                    ▼
   PRACTICE   npm run dev ─▶ Briefing tab: read the report
                          ─▶ Load pack ─▶ answer on camera ─▶ playback ─▶ coaching
                             scored against the researched rubric, not a generic one
```

## Running it

From the project root, in Claude Code:

```
/prep system design interview at Amazon
/prep product manager behavioural round at Stripe
/prep seed round investor Q&A for a developer tools startup
```

Or without the slash command, just say: *"Run the prep pipeline in `agents/` for &lt;scenario&gt;."*

Each phase is a separate agent with a separate brief, run in order, because they fail
differently: phase 1 fails by inventing sources, phase 2 by producing generic advice, phase 3
by writing questions nobody would ask. Splitting them makes each failure visible in its own
artefact rather than buried in one long output.

## The three briefs

| Phase | Brief | Writes | Fails when |
|---|---|---|---|
| 1 | [`01-research.md`](01-research.md) | `research.md` | It cites a source it did not read, or presents inference as fact |
| 2 | [`02-briefing.md`](02-briefing.md) | `briefing.md` | The rubric is advice that would fit any interview anywhere |
| 3 | [`03-questions.md`](03-questions.md) | `pack.json` | Questions are unanswerable out loud inside the target time |

## The contract

[`pack.schema.json`](pack.schema.json) is the schema `pack.json` must satisfy. The app
validates every field on load ([`src/lib/scenarios.ts`](../src/lib/scenarios.ts)) and skips a
malformed scenario with the offending field name rather than failing silently — so if a pack
does not appear in the app, the Knowledge tab says why.

`pack.json` is the source of truth. `briefing.md` is the same briefing rendered for reading on
GitHub; the app renders from `pack.json`, so if the two drift, the file is what you see in
the app.

## What these agents may not do

- **Invent a source.** Every URL in `sources` must have been fetched. A claim with no source
  is written as an inference and labelled as one.
- **Write about you.** Packs are scenario-shaped, never person-shaped. Your background goes in
  the app's Notes field, stays in your browser, and never enters the repo. This is why the
  built-in packs ship with a ground-truth *template* rather than anyone's résumé.
- **Present hearsay as policy.** Almost nothing about a company's interview rubric is
  published. Candidate reports are evidence; they are not the company speaking, and the
  briefing says which is which.
