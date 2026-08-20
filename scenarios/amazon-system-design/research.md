# Amazon system design interview — research dossier

Researched: 2026-08-20
Scenario as given: `system design interview at Amazon`
Slug: `amazon-system-design`

Evidence strength: **good.** Amazon publishes the loop shape, the six evaluation objectives,
and all 16 Leadership Principles in its own words. What it does not publish — the scoring
bar, what actually loses the round, the Bar Raiser's veto — is consistently reported across
independent sources. The rubric below is the published objectives, weighted by the reported
evidence about which of them decide outcomes.

---

## Format of the round

- **`[published]`** SDE II loops are **four 55-minute interviews**; SDE III loops are **five
  55-minute interviews**. (amazon.jobs, S1/S2)
- **`[published]`** You can expect **at least one question on software systems design**, and
  the interviewer asks questions about your design while you ask questions to complete and
  validate it. It is explicitly a two-way conversation, not a presentation. (S1)
- **`[reported, 2 sources]`** The design round itself runs 45–60 minutes. (S3, S4)
- **`[reported]`** Each round is mixed rather than pure: roughly 15–30 minutes of behavioural
  questions tied to specific Leadership Principles, then 30–45 minutes of technical work. (S4)
- **`[published]`** Different interviewers are **assigned different Leadership Principles** to
  evaluate, and each typically asks two or three behavioural questions. (S1)
- **`[reported, 2 sources]`** One interviewer is a **Bar Raiser** — trained, pulled from
  outside the hiring team, leads the debrief, and their veto is final. You are **not told
  which round they are in**. (S3, S4)
- **`[reported]`** Level changes the prompt, not the format: L4 gets bounded problems (rate
  limiter, URL shortener), L5 mid-scale (notification service, autocomplete) with sharding,
  replication and failure modes expected, L6+ gets high-scale ambiguous prompts where you are
  expected to drive and defend choices under pressure. (S4)

## What is actually graded

**`[published]`** Amazon lists six objectives for the design round, verbatim: **Practicality,
Accuracy, Efficiency, Reliability, Optimization, Scalability.** (S1, S2)

**`[published]`** Interviewers assess "both technical competencies and non-technical
competencies that are based off of our Leadership Principles." (S1) There are **16** of them.
(S6) The ones reported to recur most in engineering loops: Customer Obsession, Ownership,
Dive Deep, Deliver Results, Bias for Action. (S4)

**`[reported, 2 sources]`** The distinguishing weight is **resiliency over raw scale**. One
interviewer quoted directly: *"If you can articulate that trade-off to me, you'll get 100%
from me."* Redundancy, circuit breakers and graceful degradation are prioritised above
throughput numbers. (S3, S7)

**`[reported]`** Leadership Principles are scored **inside** the technical round, not walled
off into a behavioural block — which is what makes Amazon's design round different from
Google's or Meta's. (S3)

**`[inference]`** Because Reliability and Practicality sit in the published objective list
*and* dominate the reported failure modes, they are the highest-weight dimensions. This rests
on S1's objective list plus S3/S5/S7 independently naming resiliency as the differentiator.

## Question archetypes

1. **Scope before design.** "Design X." What is really being tested is whether you ask before
   you draw. **`[reported, 3 sources]`** The sharpest candidates spend the first five minutes
   asking; waiting for the interviewer to set scope reads as a *lack of ownership*. (S4, S5, S3)
2. **Requirements and estimation.** Functional versus non-functional, then numbers. **`[reported]`** (S3)
3. **API and data model.** Sketch the API, then the data model, before components. **`[reported]`** (S3)
4. **Failure modes.** What happens when this component dies. **`[reported, 2 sources]`** The
   most consistently reported gap between "strong hire" and "no hire". (S5, S7)
5. **Trade-off defended under pressure.** They push on a choice to see whether you argue it or
   restate it. **`[reported, 2 sources]`** (S3, S4)
6. **Operational reality.** Alarms, audit logs, reconciliation, behaviour under load.
   **`[reported]`** Maps to Dive Deep and to Amazon's Operational Excellence culture. (S7)
7. **Behavioural, inside the technical round.** Two or three per interviewer, STAR, on the LPs
   that interviewer owns. **`[published]`** (S1)

## What separates a strong answer from a weak one

**`[reported, 3 sources]`** Strong:
- Asks clarifying questions before designing — treated as a *scored signal*, not politeness. (S4, S5)
- Leads with failure: redundancy, circuit breakers, graceful degradation are the spine of the
  answer rather than a closing footnote. (S3, S5)
- Narrates reasoning continuously, so the interviewer can steer and verify understanding. (S3)
- Names a trade-off *and says which side they chose and why*. (S3)
- Reasons in Amazon's own decision language — "one-way versus two-way door" — because that is
  how decisions are actually made there, not interview trivia. (S3, S7)
- **`[published]`** On behavioural questions: specific details, with metrics or data where
  applicable. (S1)

**`[reported, 3 sources]`** Weak:
- Jumps to implementation before the high-level design. (S3, S5)
- Designs for scale and forgets resiliency. (S3, S5)
- Waits to be given the scope. (S3, S4)
- **`[reported]`** Three-layer depth failure: candidates prepare the STAR story but not the
  *reasoning behind the key decision* or *what they would do differently*. The third layer is
  what the Bar Raiser is listening for, and most people prep one layer. (S4)
- **`[published]`** Vague or hypothetical behavioural answers, where a specific one was asked
  for. (S1)

## Traps

1. **The round is not purely technical, and candidates prepare it as if it were.**
   **`[reported]`** LPs are scored inside it. (S3)
2. **You do not know which interviewer is the Bar Raiser.** **`[reported]`** So there is no
   round you can coast, and the Bar Raiser round may never open a code editor at all. (S4)
3. **Scale is the seductive wrong answer.** **`[reported, 2 sources]`** Amazon weights
   resiliency higher, and a candidate optimising throughput while ignoring failure reads as
   someone who has not operated a system. (S3, S5)
4. **"We" instead of "I".** **`[published]`** Interviewers are assigned LPs to evaluate and
   ask for what *you* did. **`[reported]`** Debriefs are evidence-based — interviewers who say
   "they seemed strong" get pushed to name a specific observed behaviour, so an answer with no
   attributable action produces no evidence to write down. (S1, S4)

## Timing

**`[inference]`** The round is 45–60 minutes of conversation, so no single spoken answer is
45 minutes long. The unit that is actually practised is the **90–150 second spoken turn**: the
scoping question, the requirements statement, the estimation, the trade-off defence. This is
what the pack decomposes into, and 150 seconds is set as the target with a 120-second green
zone. This rests on S3 and S4's phase breakdowns, not on a published Amazon statement.

## Contradictions and gaps

- **Round count varies by source.** Amazon says four (SDE II) or five (SDE III) 55-minute
  interviews (S1, S2); S4 says 4–6 sessions of 60 minutes. Amazon's own number is better
  evidenced; S4 is probably generalising across levels and orgs.
- **Round length for design specifically is not published.** 45–60 min is reported only.
- **The scoring scale is not public.** "Strong hire / no hire" language appears in candidate
  reports (S5), never in Amazon's material. Do not treat it as an official rubric.
- **Could not establish:** what an interviewer's scorecard physically looks like; whether the
  six objectives are weighted internally or scored flat; any per-level numeric bar.
- **Fetch failed:** igotanoffer.com's Bar Raiser guide returned HTTP 403 and is therefore not
  cited. The Bar Raiser claims above rest on S3 and S4 only.

## Sources

| # | Title | URL | Date | What it establishes | Bucket |
|---|---|---|---|---|---|
| S1 | Amazon — SDE II Interview Prep | https://amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep | current | Four 55-min interviews; six design objectives; LPs assigned per interviewer; 2–3 behavioural questions each; STAR; metrics | Published |
| S2 | Amazon — SDE III Interview Prep | https://amazon.jobs/content/en/how-we-hire/sde-iii-interview-prep | current | Five 55-min interviews; same six objectives | Published |
| S3 | Exponent — Amazon System Design Interview (2026) | https://www.tryexponent.com/blog/amazon-system-design-interview | 2026 | 45–60 min; phase order; resiliency weighted over scale; trade-off quote; one-way/two-way door; LPs inside the technical round | Reported |
| S4 | SpaceComplexity — Amazon Onsite Interview Loop | https://spacecomplexity.ai/blog/amazon-onsite-interview | 2026 | Per-level design expectations; first five minutes clarifying; Bar Raiser veto is final and unannounced; three layers of depth; evidence-based debrief | Reported |
| S5 | DesignGurus — Amazon System Design Mock Interview Guide | https://www.designgurus.io/blog/amazon-system-design-mock-interview-preparation-guide | current | Clarifying questions and failure modes as the strong-hire / no-hire differentiators | Reported |
| S6 | Amazon — Leadership Principles | https://www.amazon.jobs/content/en/our-workplace/leadership-principles | current | The 16 principles and their official wording | Published |
| S7 | Topalupu — Amazon SDE Interview 2026 | https://www.topalupu.com/blog/amazon-sde-interview-2026 | 2026 | Design for failure, talk trade-offs aloud, sound like an owner; alarms/audit logs/reconciliation expected | Reported |
