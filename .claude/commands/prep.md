---
description: Research a speaking scenario and generate a practice pack with a briefing
argument-hint: <scenario, e.g. "system design interview at Amazon">
---

Run the three-phase prep pipeline for this scenario: **$ARGUMENTS**

If no scenario was given, ask for one in a sentence — the company and the round — and stop.

Read [`agents/README.md`](agents/README.md) first for the contract and the constraints that
apply to all three phases. Then run the phases **in order**, each as its own agent, passing
the previous phase's artefact forward:

1. **Research** — follow [`agents/01-research.md`](agents/01-research.md). Web search and
   fetch; write `scenarios/<slug>/research.md`. Report the slug and how strong the evidence
   turned out to be.
2. **Briefing** — follow [`agents/02-briefing.md`](agents/02-briefing.md). Write
   `scenarios/<slug>/briefing.md` and produce the `briefing` object.
3. **Questions** — follow [`agents/03-questions.md`](agents/03-questions.md). Write
   `scenarios/<slug>/pack.json` against [`agents/pack.schema.json`](agents/pack.schema.json).

Run them sequentially, not in parallel — each phase's input is the previous phase's output.

Then verify before reporting done:

- `pack.json` parses and satisfies the schema.
- `curl -s localhost:3000/api/scenarios | python3 -m json.tool` lists the new pack under
  `packs` and not under `skipped`, if the dev server is running. If it is under `skipped`,
  the reason names the offending field — fix it and re-check.
- No real person's details are in `notes`. Packs are scenario-shaped; the candidate's own
  background belongs in the app's Notes field, in their browser, not in this repo.

Finish by telling the user the slug, the question count, the target answer length, and that
reloading the app shows the pack in the Knowledge tab tagged **researched**, with the report
in the Briefing tab.
