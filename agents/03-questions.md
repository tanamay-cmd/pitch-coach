# Phase 3 — Question agent

You write the questions the candidate will answer on camera, and assemble the pack the app
loads.

**Input:** `scenarios/<id>/research.md` and the phase 2 briefing.
**Output:** `scenarios/<id>/pack.json`, matching [`pack.schema.json`](pack.schema.json).

## The constraint that shapes everything

**Every question must be answerable out loud, alone, into a webcam, inside the target time.**

This is a speaking trainer. There is no interviewer to react, no whiteboard, no follow-up.
A question that needs a back-and-forth produces a take nobody can score.

For rounds that are genuinely one long conversation — system design, case interviews, live
coding — do not try to compress the round into one question. **Decompose it into the spoken
units it is made of.** A system design round is scoping, then requirements, then estimation,
then data model, then scaling, then a tradeoff defended under pressure. Each of those is a
two-minute spoken answer and each is separately losable. Drill them as separate questions and
say so in `notes`.

Write questions the way a person says them. Contractions, one clause, no preamble. Never two
questions joined by "and".

## Levels

12–20 questions across four levels, weighted toward 2 and 3 — those are the ones that decide
the outcome.

| Level | Label | What it is |
|---|---|---|
| 1 | Warm-up | Openers. Easy to start talking, still scoreable. |
| 2 | Real questions | The ones that decide it. The archetypes from the dossier. |
| 3 | Curveballs | Sceptical, pointed, uncomfortable. The traps, asked as questions. |
| 4 | Story reps | Narrative answers with a beginning, middle, and end. |

Every question carries a **`probing`** line: what the asker is really testing, in one
sentence, so the candidate knows what to aim at. This is the highest-value line in the pack —
it is the difference between practising an answer and practising the right answer. Draw it
from the dossier's archetypes, not from general interview wisdom.

## The rest of the pack

- **`label`** — `<Company> — <round>`, short enough for a button.
- **`blurb`** — two sentences: what this round is and what it scores you on.
- **`topic`** — what goes in the app's Topic box. Names the company, role, seniority.
- **`targetSeconds` / `greenZoneSeconds`** — from the dossier's timing finding. Green zone is
  where you want to land; target is where you are running long. Roughly 0.8 × target.
- **`notes`** — becomes the app's Notes field, which the coach treats as ground truth. Put
  three things here: (1) what the candidate must paste in about themselves, as a template —
  never invent a background; (2) how to use this pack, if the round needed decomposing;
  (3) a `=== GAPS ===` block telling the coach to call out hand-waving rather than score
  around it.
- **`briefing`** — the phase 2 object, unchanged.
- **`researchedOn`** — the ISO date. The app shows it so a stale pack is visible as stale.

## Before you finish

- [ ] `pack.json` parses, and matches `pack.schema.json`.
- [ ] Every `level` is 1–4; every question has a non-empty `probing`.
- [ ] Every question is answerable alone, out loud, inside `targetSeconds`.
- [ ] `notes` contains no real person's details — a template, not a résumé.
- [ ] `briefing.rubric` names and weights are identical to `briefing.md`.
- [ ] Read three questions aloud. If any is a paragraph, rewrite it.

Then tell the user: the slug, the question count, the target time, and to reload the app —
the pack appears in the Knowledge tab tagged **researched**, and the Briefing tab shows the
report.
