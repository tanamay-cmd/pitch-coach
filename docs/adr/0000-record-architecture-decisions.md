# 0000. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-04-25
- **Deciders:** Project owner, Claude

## Context

Projects accumulate decisions — library choices, schema shapes, auth approaches, tradeoffs accepted under deadline. Months later, the *why* is gone, and the next person (or the same person) re-litigates the same question or worse, silently undoes the decision without realizing it was load-bearing.

We need a lightweight, durable way to capture decisions so that:

- The reasoning survives team changes and time.
- Stale decisions are explicitly superseded, not silently overwritten.
- AI assistants like Claude have a grounded source of truth for "why is it like this?" instead of guessing.

## Decision drivers

- Low ceremony — must be cheap enough that we actually do it.
- Durable — lives next to the code, in version control.
- AI-readable — plain markdown, predictable structure.
- Searchable — one decision per file, descriptive titles.

## Considered options

1. **Architecture Decision Records (ADRs) in the repo.**
2. **Wiki / Notion / Confluence pages.**
3. **No formal record — rely on commit messages and PR descriptions.**

### Option 1 — ADRs in the repo
- 👍 Versioned with the code, reviewable in PRs, AI-readable, low ceremony.
- 👎 Requires discipline to actually write them.

### Option 2 — Wiki
- 👍 Easy to edit, friendly to non-engineers.
- 👎 Drifts from code reality, often unreadable to AI tools, can be forgotten.

### Option 3 — No formal record
- 👍 Zero overhead.
- 👎 The why is lost; the same decision gets re-litigated.

## Decision

Use **Option 1: ADRs in the repo**, in `docs/adr/` (or wherever the project keeps technical docs), using the template at [`docs/adr/template.md`](template.md). One decision per file. Format is MADR-flavored (Title, Status, Date, Deciders, Context, Drivers, Options, Decision, Consequences, References).

Status flow: `Proposed` → `Accepted` → `Deprecated` | `Superseded by ADR-NNNN`. Accepted ADRs are not edited; they are superseded.

This ADR (0000) records the decision to use ADRs.

## Consequences

- **Positive:** decisions become discoverable, reviewable, and durable. Claude can ground recommendations in stated decisions instead of guessing.
- **Negative / accepted tradeoffs:** small overhead per decision (~10 minutes). Easy to skip when rushed; the working agreement in `CLAUDE.md` mitigates this by requiring an ADR for non-trivial decisions.
- **Follow-ups:** when a project is initialized from this baseline, copy `template.md` into the project's `docs/adr/` and seed with a project-specific 0000 if useful.

## References

- ADR community: https://adr.github.io/
- Michael Nygard, *Documenting Architecture Decisions.*
- AWS, *Master architecture decision records: Best practices.* https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/

## Review note (added one month later)

> _empty until 2026-05-25_
