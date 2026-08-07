import type { ModeId } from './types'

export interface ModeDef {
  id: ModeId
  label: string
  blurb: string
  /** Shown under the question card as the shape to aim for. */
  formula: string
  defaultTargetSeconds: number
  topicPlaceholder: string
  /** Used when there is no API key — generic questions parameterised by topic. */
  fallbackQuestions: { level: number; text: string }[]
}

const T = '{{topic}}'

export const MODES: ModeDef[] = [
  {
    id: 'interview',
    label: 'Interview',
    blurb:
      'Behavioural and technical questions for a specific role. Feedback scores you on STAR structure, specificity, and whether the answer actually landed.',
    formula: 'Situation → Task → Action → Result. Lead with the headline result, then back-fill.',
    defaultTargetSeconds: 90,
    topicPlaceholder: 'e.g. Senior Backend Engineer at Stripe — payments, Go, high availability',
    fallbackQuestions: [
      { level: 1, text: `Walk me through your background as it relates to ${T}.` },
      { level: 1, text: `Why this role, and why now?` },
      { level: 1, text: `What part of ${T} are you strongest at? Give me an example.` },
      { level: 2, text: `Tell me about a time you disagreed with a technical decision. What did you do?` },
      { level: 2, text: `Describe a project in ${T} that did not go to plan. What did you change?` },
      { level: 2, text: `How do you decide what to build first when everything is urgent?` },
      { level: 2, text: `Tell me about the hardest bug or failure you have debugged.` },
      { level: 3, text: `What is the most important thing you would change in how teams approach ${T}?` },
      { level: 3, text: `Where are you weakest relative to this role, and what are you doing about it?` },
      { level: 3, text: `Sell me on hiring you over someone with two more years of experience.` },
      { level: 4, text: `Tell me the story of the work you are proudest of, start to finish.` },
      { level: 4, text: `Describe a time you changed someone's mind. Take me through it.` },
    ],
  },
  {
    id: 'impromptu',
    label: 'Impromptu',
    blurb:
      'Cold-start speaking on any topic, up to a minute. Feedback scores you on whether the first sentence answered the question, and whether you got to a point.',
    formula: 'Answer → Story → So what. First sentence is your answer. Repeat the question inside it.',
    defaultTargetSeconds: 60,
    topicPlaceholder: 'e.g. AI safety, product management, the future of remote work',
    fallbackQuestions: [
      { level: 1, text: `Explain ${T} to someone who has never heard of it.` },
      { level: 1, text: `What first got you interested in ${T}?` },
      { level: 1, text: `What is the most common misconception about ${T}?` },
      { level: 2, text: `What is overrated about ${T} right now?` },
      { level: 2, text: `If you had to bet on one change in ${T} over the next two years, what is it?` },
      { level: 2, text: `Who is getting ${T} right, and what are they doing differently?` },
      { level: 3, text: `Argue the opposite of what you believe about ${T}.` },
      { level: 3, text: `What would have to be true for you to be completely wrong about ${T}?` },
      { level: 3, text: `What does everyone in ${T} agree on that is probably false?` },
      { level: 4, text: `Tell a story about a moment ${T} changed how you think.` },
      { level: 4, text: `Describe the best explanation of ${T} you have ever heard, and why it worked.` },
    ],
  },
  {
    id: 'pitch',
    label: 'Pitch',
    blurb:
      'Investor, customer, and press questions about a company or product. Feedback checks the answer holds up under a sceptic and does not hand-wave.',
    formula: 'Claim → Evidence → Why it matters to them. No jargon they did not use first.',
    defaultTargetSeconds: 60,
    topicPlaceholder: 'e.g. Acme Analytics — usage-based billing for API companies, seed round',
    fallbackQuestions: [
      { level: 1, text: `What does ${T} do? Explain it to your grandmother.` },
      { level: 1, text: `Why did you personally start working on ${T}?` },
      { level: 1, text: `Who is the customer, and what do they do today instead?` },
      { level: 2, text: `What is your unfair advantage?` },
      { level: 2, text: `How do you make money, and what does a deal look like?` },
      { level: 2, text: `What has to go right for this to be a big company?` },
      { level: 3, text: `Isn't this a feature, not a company? Why won't an incumbent just ship it?` },
      { level: 3, text: `Why now? Why didn't this exist three years ago?` },
      { level: 3, text: `You're small. Why should an enterprise buyer trust you?` },
      { level: 3, text: `What keeps you up at night about ${T}?` },
      { level: 4, text: `Tell me the story of your first customer, start to finish.` },
      { level: 4, text: `Where is ${T} in five years, and what did it take to get there?` },
    ],
  },
  {
    id: 'script',
    label: 'Script',
    blurb:
      'Deliver a prepared script or talk track from memory. Feedback scores coverage against your script plus delivery, not invention.',
    formula: 'Hit every beat in order. Sounding natural beats reciting word-for-word.',
    defaultTargetSeconds: 90,
    topicPlaceholder: 'e.g. My 90-second intro for the demo day stage',
    fallbackQuestions: [
      { level: 1, text: 'Deliver your script from memory. Do not read it.' },
      { level: 2, text: 'Deliver your script, but open with a different first sentence than written.' },
      { level: 3, text: 'Deliver your script in half the time. Keep every load-bearing point.' },
      { level: 4, text: 'Deliver your script as if the audience is sceptical and short on time.' },
    ],
  },
]

export const MODE_BY_ID: Record<ModeId, ModeDef> = Object.fromEntries(
  MODES.map((m) => [m.id, m]),
) as Record<ModeId, ModeDef>

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Warm-up',
  2: 'Real questions',
  3: 'Curveballs',
  4: 'Story reps',
}
