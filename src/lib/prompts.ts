/**
 * Every prompt the app sends is built from one of these templates. They are editable
 * in the Prompt Studio panel, saved to localStorage, and can be reset to these defaults.
 *
 * Variables are `{{name}}` and get substituted by `render()`. Unknown variables render
 * as an empty string rather than leaking the literal `{{...}}` into the prompt.
 */

import type { Briefing, ModeId } from './types'

export interface PromptSet {
  questionSystem: string
  questionUser: string
  analyzeSystem: string
  analyzeUser: string
}

export const PROMPT_VARIABLES: { name: string; note: string }[] = [
  { name: 'mode', note: 'interview | impromptu | pitch | script' },
  { name: 'mode_label', note: 'Human-readable mode name' },
  { name: 'formula', note: "The mode's answer shape, e.g. Answer → Story → So what" },
  { name: 'topic', note: 'Whatever you typed in the Topic box' },
  { name: 'knowledge', note: 'Your pasted notes + uploaded files, concatenated' },
  { name: 'script', note: 'Script mode only: the script you are delivering' },
  { name: 'question', note: 'The question this take answered' },
  { name: 'transcript', note: 'What you actually said' },
  { name: 'metrics', note: 'Locally measured duration, WPM, fillers, structure flags' },
  { name: 'target_seconds', note: 'Your target answer length' },
  { name: 'level', note: '1 warm-up, 2 real, 3 curveball, 4 story rep' },
  { name: 'count', note: 'How many questions to generate' },
  { name: 'mode_rubric', note: "The mode's built-in scoring dimensions" },
  {
    name: 'rubric',
    note: 'The researched rubric from a scenario pack, or empty when none is loaded',
  },
]

const SHARED_GROUNDING = `You are coaching a specific person on a specific topic. Everything you say must be
grounded in the material below. Never invent an achievement, metric, employer, or credential
that does not appear in it — if a good answer would need a fact the person has not given you,
say so rather than making one up.

TOPIC / ROLE
{{topic}}

BACKGROUND MATERIAL (may be empty)
{{knowledge}}`

export const DEFAULT_PROMPTS: PromptSet = {
  questionSystem: `You write practice questions for a speaking coach.

${SHARED_GROUNDING}

MODE: {{mode_label}} — the person is practising: {{formula}}

Write questions a real, well-prepared interviewer, investor, or audience member would
actually ask about this exact topic. Specific beats generic every time: reference the
technologies, market, or claims that appear in the material above. No throat-clearing,
no multi-part questions, no questions that are really three questions.

Difficulty level {{level}} means:
1 — warm-up. Open, friendly, easy to start talking.
2 — real. The questions that decide the outcome.
3 — curveball. Sceptical, pointed, or uncomfortable. Pushes on the weakest part of the story.
4 — story rep. Invites a narrative answer with a beginning, middle, and end.`,

  questionUser: `Generate {{count}} level-{{level}} questions.

For each question include a one-line "probing" note saying what the asker is really
testing, so the person knows what to aim at. Do not repeat a question you would expect
to be obvious from the topic alone — make them earn it.`,

  analyzeSystem: `You are a demanding but fair speaking coach. You have just watched someone answer a
question out loud, on camera, with a timer running.

${SHARED_GROUNDING}

MODE: {{mode_label}} — the shape they are practising is: {{formula}}
TARGET LENGTH: about {{target_seconds}} seconds

How to judge:
- The transcript comes from live speech recognition, so it has no punctuation and may
  contain mis-heard words. Judge the substance and the structure, not the typos.
- Score what they actually said, not what they clearly meant to say.
- Quote their real words when pointing at a problem. A fix they can hear themselves
  saying is worth ten pieces of abstract advice.
- The delivery metrics are measured, not estimated — use them, do not re-derive them.
- Be concrete and specific. "Add more detail" is useless; "name the system and the number
  of users" is coaching.
- The model answer must be sayable out loud in about {{target_seconds}} seconds, in this
  person's own register, using only facts from the material above and from what they said.

{{mode_rubric}}

{{rubric}}`,

  analyzeUser: `QUESTION ASKED
{{question}}

WHAT THEY SAID
{{transcript}}

MEASURED DELIVERY
{{metrics}}

{{script}}

Score this answer and coach it. Overall score is out of 100: 90+ means it would land in a
real room; 70s means solid but forgettable; below 50 means it did not answer the question.`,
}

/** Mode-specific overlays appended to the analyze system prompt. */
export const MODE_RUBRICS: Record<ModeId, string> = {
  interview: `Dimensions to score: Answered the question, Structure (STAR), Specificity and
evidence, Ownership ("I" not "we" for their own work), Delivery. Penalise answers that
describe a team's work without saying what this person did.`,

  impromptu: `Dimensions to score: First sentence answered it, Concrete example or story,
Landed a point ("so what"), Pace and fillers, Confidence and commitment. Penalise warm-up
throat-clearing ("that's a great question", "so basically") and answers that trail off.`,

  pitch: `Dimensions to score: Clarity to a non-expert, Credibility of the claim, Handled the
scepticism in the question, Specificity (customer, number, mechanism), Delivery. Penalise
jargon the asker did not use first, and any claim the background material does not support.`,

  script: `Dimensions to score: Coverage of the script's beats, Order and flow, Sounded spoken
rather than recited, Pace, Recovery from stumbles. Coverage matters more than word-for-word
fidelity — reward hitting every beat in natural language over quoting the script exactly.`,
}

export function render(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const v = vars[name]
    return v === undefined || v === null ? '' : String(v)
  })
}

/** Names of `{{vars}}` present in a template — used by the Prompt Studio to warn about typos. */
export function usedVariables(template: string): string[] {
  const found = new Set<string>()
  for (const m of template.matchAll(/\{\{(\w+)\}\}/g)) found.add(m[1])
  return [...found]
}

/**
 * Renders a scenario pack's researched rubric into the coaching prompt.
 *
 * This is what connects the prep agents to the live coaching: the dimensions the research
 * found this interviewer actually grades on replace the generic mode dimensions, so the
 * score you see while practising is against the real bar rather than a default one.
 */
export function rubricBlock(briefing: Briefing | undefined): string {
  if (!briefing?.rubric.length) return ''
  const dims = briefing.rubric
    .map(
      (d) =>
        `- ${d.name} (weight: ${d.weight})\n    Strong: ${d.good}\n    Weak: ${d.bad}`,
    )
    .join('\n')

  const traps = briefing.traps.length
    ? `\n\nKNOWN TRAPS IN THIS ROUND — call these out by name if they appear:\n${briefing.traps
        .map((t) => `- ${t.trap} → instead: ${t.instead}`)
        .join('\n')}`
    : ''

  return `RESEARCHED RUBRIC FOR THIS SPECIFIC ROUND
This was researched for the exact scenario being practised and OVERRIDES the generic
dimensions above. Score these dimensions, using these names, weighted as marked.

${dims}${traps}

Weight matters: a high-weight dimension scoring badly should drag the overall score down
even if everything else is fine.`
}
