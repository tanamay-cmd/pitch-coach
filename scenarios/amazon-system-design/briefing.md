# Amazon system design interview — briefing

**Amazon is not scoring your architecture. It is scoring whether you scope before you draw,
design for failure before you design for scale, and sound like the owner of the thing you
just described.**

Researched 2026-08-20 · 7 sources · dossier in [`research.md`](research.md)

Amazon publishes the loop shape and the six things this round evaluates. It does not publish
the bar. Everything below about what actually loses the round is consistently reported across
independent sources — treat it as well-evidenced hearsay, not policy.

## What the round looks like

Four 55-minute interviews for SDE II, five for SDE III, with at least one dedicated to
software systems design. The design conversation runs 45–60 minutes and is explicitly
two-way: the interviewer questions your design while you question the problem. Each round is
mixed — expect 15–30 minutes of behavioural questions tied to Leadership Principles before
the technical work, because Amazon scores Leadership Principles *inside* the technical round
rather than in a separate block. One interviewer in your loop is a Bar Raiser, from outside
the hiring team, whose veto is final; you will not be told which one.

## Why they ask what they ask

| Archetype | What it is really testing |
|---|---|
| "Design X", with no scope given | Whether you ask before you draw. Waiting to be given the scope reads as a lack of ownership, and the first five minutes are scored. |
| Requirements and estimation | Whether you separate functional from non-functional and commit to numbers instead of hedging. |
| API and data model | Whether the schema follows from the access patterns or from habit. |
| "What happens when this dies?" | Reliability is one of the six published objectives and the most consistently reported gap between a strong hire and a no-hire. |
| Pushing back on a choice you made | Whether you argue the trade-off or restate the choice louder. |
| Alarms, audit logs, reconciliation | Dive Deep. Whether you have operated a system or only designed one. |
| Behavioural questions mid-round | The Leadership Principles that interviewer was assigned. Every principle has an owner somewhere in your loop. |

## The rubric you are scored on

Amazon's own six objectives for this round are Practicality, Accuracy, Efficiency,
Reliability, Optimization and Scalability. The weights below come from which of them the
evidence says actually decide outcomes.

| Dimension | Weight | Strong | Weak |
|---|---|---|---|
| **Scoping before designing** | high | Opens with questions about users, scale, and what is out of scope, and states the scope back before drawing anything. | Starts describing components in the first thirty seconds, or waits to be told the scope. |
| **Reliability — designed for failure** | high | Names what breaks, and the redundancy, circuit breaker, or degradation path, as part of the design rather than after it. | Optimises throughput and reaches failure handling only when asked, or not at all. |
| **Trade-off articulation** | high | Names both options, picks one, and says what that choice costs. | Asserts a choice with no alternative named, or lists options without choosing. |
| **Ownership language** | medium | Says what *I* decided and why; reasons in one-way versus two-way doors. | Narrates a team's work as "we" so nothing is attributable, or hedges every decision. |
| **Structured narration** | medium | Talks continuously through the reasoning so the interviewer can follow and steer. | Long silences, or jumping between layers so the listener loses the thread. |
| **Operational depth** | medium | Names the alarm, the metric, the audit log, the reconciliation path. | "We'd monitor it" with nothing specific behind it. |

These dimensions are sent to the coach with every take, so your score is against this rubric —
not the app's generic interview one.

## What a good answer does

- Asks before it draws, and states the scope back before designing.
- Leads with failure: what breaks, and what happens when it does.
- Names the trade-off, picks a side, and says what the side costs.
- Says "I decided" about your own decisions, with the reason attached.
- Narrates continuously, so the interviewer can steer rather than guess.
- On behavioural questions: a specific situation, with metrics or data where they exist.

## What a bad answer does

- Jumps to components before establishing the high-level design.
- Designs for scale and treats resiliency as a closing footnote.
- Waits for the interviewer to set the scope.
- Stops at the STAR story, with no reasoning behind the decision and no hindsight.
- Answers a behavioural question hypothetically when a specific example was asked for.
- Narrates a team's work with no attributable action of your own in it.

## Traps

1. **You will prepare this as a technical round, and it is not one.** Leadership Principles
   are scored inside it. Half your prep should be stories.
   *Instead:* have 10–12 specific stories ready, and expect 15–30 minutes of them before you
   touch the design.

2. **You do not know which interviewer is the Bar Raiser.** There is no round you can coast,
   and theirs may never open a code editor.
   *Instead:* assume every interviewer is the one with the veto, and hold the same standard in
   the round that feels like a formality.

3. **Scale is the seductive wrong answer.** Amazon weights resiliency above raw throughput,
   and optimising QPS while ignoring failure reads as someone who has never been on call.
   *Instead:* say what breaks before you say how fast it goes.

4. **The third layer is missing.** Most candidates prepare the story. Almost none prepare the
   reasoning behind the key decision, or what they would do differently — which is the layer
   the Bar Raiser is actually listening for.
   *Instead:* for every story, rehearse the decision you made, the alternative you rejected,
   and the one thing you would change.

5. **"We" produces no evidence.** Debriefs are evidence-based; an interviewer who liked you
   still has to name a specific observed behaviour.
   *Instead:* say "I" about your own work, even when the work was a team's.

## Before you practise

1. Paste your real background into the app's Notes field — the systems you have operated, with
   rough numbers. The coach will not invent a fact you have not given it.
2. Write down which level you are interviewing at. L4 gets bounded problems; L5 is expected to
   handle sharding, replication and failure modes; L6+ is expected to drive an ambiguous prompt.
3. Pick 10–12 stories and map them across the 16 Leadership Principles. Note which principles
   have no story yet — those are the gaps.
4. For your three strongest stories, write the third layer: the decision, the rejected
   alternative, and what you would change.
5. Have one incident ready where something you built failed in production, and what changed
   permanently afterwards.
6. Drill the questions in this pack one at a time. Each is a 90–150 second spoken unit of the
   round, not the whole round.

## Sources

| Source | What it established |
|---|---|
| [Amazon — SDE II Interview Prep](https://amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep) | Four 55-minute interviews; the six design objectives; Leadership Principles assigned per interviewer; STAR; metrics |
| [Amazon — SDE III Interview Prep](https://amazon.jobs/content/en/how-we-hire/sde-iii-interview-prep) | Five 55-minute interviews at SDE III |
| [Amazon — Leadership Principles](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) | The 16 principles and their official wording |
| [Exponent — Amazon System Design Interview (2026)](https://www.tryexponent.com/blog/amazon-system-design-interview) | 45–60 minute round; phase order; resiliency weighted over scale; Leadership Principles scored inside the technical round |
| [SpaceComplexity — Amazon Onsite Interview Loop](https://spacecomplexity.ai/blog/amazon-onsite-interview) | Per-level design expectations; the unannounced Bar Raiser and the final veto; the three layers of depth |
| [DesignGurus — Amazon System Design Mock Interview Guide](https://www.designgurus.io/blog/amazon-system-design-mock-interview-preparation-guide) | Clarifying questions and failure modes as the strong-hire / no-hire differentiators |
| [Topalupu — Amazon SDE Interview 2026](https://www.topalupu.com/blog/amazon-sde-interview-2026) | Design for failure, talk trade-offs aloud, sound like an owner; alarms, audit logs and reconciliation expected |
