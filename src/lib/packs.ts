import type { PrepPack, Question } from './types'

export type { PrepPack } from './types'

/**
 * Built-in packs are scenario-shaped, not person-shaped. They ship with the app and
 * carry no personal detail — the `notes` field is a template telling you what ground
 * truth to paste in, because the coach is forbidden from inventing facts you have not
 * given it.
 *
 * For a pack researched against a real company and round — the questions that company
 * actually asks, its published rubric, the traps — run the prep pipeline in `agents/`
 * and the generated pack appears alongside these. See `scenarios/README.md`.
 */

const q = (level: number, text: string, probing: string): Question => ({ level, text, probing })

/** Every pack's notes start here: the coach is only as grounded as what you paste in. */
const NOTES_HEADER = `=== GROUND TRUTH (the coach may not invent anything outside this) ===

Replace this block with your own material before you practise. The more specific it is,
the more specific the coaching gets. Useful things to paste:`

const pack = (p: Omit<PrepPack, 'origin'>): PrepPack => ({ ...p, origin: 'built-in' })

export const PACKS: PrepPack[] = [
  pack({
    id: 'behavioural-interview',
    label: 'Behavioural interview (STAR)',
    blurb:
      'The "tell me about a time" round. Scores you on whether the story has a real result, whether you say "I" instead of "we", and whether it lands inside two minutes.',
    mode: 'interview',
    topic: 'Behavioural interview — [role] at [company]',
    targetSeconds: 120,
    greenZoneSeconds: 90,
    notes: `${NOTES_HEADER}
- Your resume, or the four or five projects you would actually tell stories about.
- The job description you are interviewing against.
- The numbers you are allowed to cite: users, latency, revenue, team size, timeline.
- Anything you must NOT say — an NDA boundary, an unannounced product, a former employer.

=== GAPS (say so rather than letting the coach score around them) ===

List the facts you do not have yet. A vague number is worse than no number, and the coach
should call it out rather than accept hand-waving.`,
    questions: [
      q(1, 'Tell me about yourself.', 'Whether you have one coherent thread or a list of unrelated jobs. They decide in the first ten seconds.'),
      q(1, 'Walk me through a project you are proud of.', 'Whether you describe a system and your part in it, or narrate a feature tour. Pick one project and commit.'),
      q(1, 'Why this role, and why now?', 'Whether you will still be interested in six months, or are just leaving something.'),
      q(2, 'Tell me about a time you disagreed with a technical decision.', 'Whether you can hold a position without being difficult, and whether you changed your mind when shown evidence.'),
      q(2, 'Describe a project that did not go to plan. What did you change?', 'Whether you can name your own contribution to a bad outcome instead of blaming the org.'),
      q(2, 'Tell me about a time you had to influence someone without authority.', 'What the other person was protecting, and what you did other than argue harder.'),
      q(2, 'How do you decide what to build first when everything is urgent?', 'Whether you have a real prioritisation method or just work hard.'),
      q(2, 'Tell me about the hardest bug you have debugged.', 'Whether you reason from evidence or from guessing. They want the method, not the fix.'),
      q(3, 'Tell me about a time you failed.', 'A real failure with a permanent change after it. A disguised humblebrag ends the answer.'),
      q(3, 'Where are you weakest relative to this role, and what are you doing about it?', 'Self-knowledge. "I work too hard" fails; so does a weakness that is load-bearing for the job.'),
      q(3, 'Tell me about a time you received hard feedback.', 'Whether you can repeat the feedback accurately, which shows you actually heard it.'),
      q(3, 'Sell me on hiring you over someone with two more years of experience.', 'Whether you can make a case for yourself without either shrinking or overclaiming.'),
      q(4, 'Tell me the story of the work you are proudest of, start to finish.', 'A narrative with a beginning, a middle, and a result — not a status update.'),
      q(4, 'Take me through a time you changed someone’s mind.', 'The mechanics of persuasion: what they believed, what moved them, what you conceded.'),
    ],
  }),

  pack({
    id: 'system-design-interview',
    label: 'System design — spoken components',
    blurb:
      'System design broken into the parts you actually say out loud. Each question is one component of the round — scoping, data model, scaling, tradeoffs — sized to be answered in two to three minutes rather than forty-five.',
    mode: 'interview',
    topic: 'System design interview — [seniority] [role] at [company]',
    targetSeconds: 150,
    greenZoneSeconds: 120,
    notes: `${NOTES_HEADER}
- The systems you have actually operated, with rough numbers: QPS, data volume, team size.
- The technologies you can defend under follow-up, and the ones you have only read about.
- A design decision you got wrong in production and what it cost.
- The seniority you are interviewing at — a senior bar wants tradeoffs, a junior bar wants correctness.

=== HOW TO USE THIS PACK ===

A real system design round runs 45 minutes as one continuous conversation. You cannot
practise that here, and you should not try to. What loses these rounds is almost never the
architecture — it is the two-minute spoken units: an unstructured opening, a data model you
cannot justify, a tradeoff you assert instead of argue. Each question below is one of those
units. Drill them separately, then run them together elsewhere.

=== GAPS ===

List what you cannot yet answer with a number. The coach should say so rather than accept a
hand-wave.`,
    questions: [
      q(1, 'A user says "design Twitter". Before you draw anything, what do you ask?', 'Whether you scope or start drawing. Jumping to boxes is the single most common failure in this round.'),
      q(1, 'State the requirements for the system you just scoped, in one pass.', 'Whether you separate functional from non-functional, and whether you commit to numbers.'),
      q(1, 'Give me your back-of-the-envelope estimate for this system.', 'Whether the arithmetic is out loud and roughly right, not whether it is exact.'),
      q(2, 'Walk me through your data model and why it is shaped that way.', 'Whether the schema follows from the access patterns or from habit.'),
      q(2, 'Where does this system break first as traffic grows 100x?', 'Whether you know your own design’s weakest point before they find it.'),
      q(2, 'How would you shard this, and what breaks when you do?', 'Whether you can name the cost of your own choice: cross-shard queries, hot keys, rebalancing.'),
      q(2, 'Talk me through the read path end to end, including the caches.', 'Whether you can hold a full path in your head and narrate it in order.'),
      q(2, 'What are you storing where, and why not somewhere else?', 'Whether the storage choice is argued or defaulted to whatever you used last.'),
      q(3, 'Defend that choice. Why not the obvious alternative?', 'Whether you argue the tradeoff or restate the choice louder.'),
      q(3, 'Your cache goes down at peak. Walk me through the next ten minutes.', 'Failure thinking under pressure — thundering herd, degradation, what you shed.'),
      q(3, 'Where are you willing to give up consistency here, and where are you not?', 'Whether you can name a boundary rather than reciting CAP.'),
      q(3, 'How do you know this system is healthy? What is on the dashboard?', 'Whether you have operated something or only designed it.'),
      q(3, 'What did you deliberately leave out of this design, and why?', 'Senior signal. Naming what you cut is stronger than covering everything shallowly.'),
      q(4, 'Take me through the hardest design decision you made in production and what it cost.', 'A real tradeoff with a loser. Name what you gave up.'),
      q(4, 'Tell me about a system you inherited that was broken, start to finish.', 'What was actually broken versus what you were told was broken.'),
    ],
  }),

  pack({
    id: 'technical-deep-dive',
    label: 'Technical deep dive',
    blurb:
      'The round where they pick something on your resume and push until you hit the edge of what you know. Scores you on precision, and on saying "I do not know" cleanly.',
    mode: 'interview',
    topic: 'Technical deep dive — [the project or system on your resume they will pick]',
    targetSeconds: 120,
    greenZoneSeconds: 90,
    notes: `${NOTES_HEADER}
- The project they are most likely to pick, in detail: architecture, your part, the numbers.
- The parts of it you did NOT build, so you never claim someone else's work.
- The decisions you would make differently now.
- The layer below the one you worked at — they will push down one level and see if you follow.

=== GAPS ===

Name the edges of your knowledge here. Practising a confident wrong answer is worse than
practising "I have not gone that deep — here is how I would find out."`,
    questions: [
      q(1, 'Pick one system you built and explain what it does in ninety seconds.', 'Whether a non-expert would follow it. Jargon density is the tell.'),
      q(1, 'What was your specific contribution, as opposed to the team’s?', 'Ownership. "We" answers are unscoreable and they will keep digging until you say "I".'),
      q(2, 'Why did you build it that way rather than the simpler thing?', 'Whether the complexity was earned or inherited.'),
      q(2, 'What broke in production, and what did you change afterwards?', 'Whether the lesson was structural or just "we were more careful".'),
      q(2, 'Take me one layer down. What is actually happening underneath?', 'The standard escalation. They push until you stop, and how you stop matters.'),
      q(2, 'What would you do differently if you started again tomorrow?', 'Whether you have reflected, or are still defending the original decision.'),
      q(3, 'That is not quite right, is it? Walk me through it again.', 'Composure under a challenge that may or may not be fair. Do not fold, do not dig in.'),
      q(3, 'How did you know it worked? What did you measure?', 'Whether "it worked" means evidence or means it shipped.'),
      q(3, 'What is the part of this you understand least well?', 'Calibration. A confident answer here is worth more than pretending the edge is not there.'),
      q(4, 'Tell me the whole story of building it — the first week to the day it shipped.', 'Narrative coherence over a long stretch, and whether the hard part gets the airtime.'),
    ],
  }),

  pack({
    id: 'investor-pitch',
    label: 'Investor pitch Q&A',
    blurb:
      'The questions after the deck, not the deck. Scores you on whether a claim survives a sceptic, and whether you answer the question you were asked.',
    mode: 'pitch',
    topic: '[Company] — [one-line description] raising [round]',
    targetSeconds: 75,
    greenZoneSeconds: 60,
    notes: `${NOTES_HEADER}
- What the company does, in one sentence a non-expert would repeat correctly.
- The metrics you can actually cite: revenue, users, growth rate, retention, pipeline.
- The metrics you cannot cite yet, so the coach flags a hand-wave instead of scoring it.
- The competitive landscape and your honest read on why you win.
- The round: amount, use of funds, what it buys you in months.

=== GAPS ===

Investors punish invented numbers harder than missing ones. List what you do not have.`,
    questions: [
      q(1, 'What do you do? Explain it to someone outside your industry.', 'Whether they could repeat it back. If they cannot, nothing else in the meeting lands.'),
      q(1, 'Who is the customer, and what do they do today instead?', 'Whether you know the real alternative — usually a spreadsheet or nothing, not a competitor.'),
      q(1, 'Why did you personally start working on this?', 'Founder-market fit. They are checking whether you will still be here in four years.'),
      q(2, 'What is the traction? Give me the numbers.', 'Whether you lead with your strongest real metric or bury it under narrative.'),
      q(2, 'How do you make money, and what does one deal look like?', 'Whether the unit economics are known or aspirational.'),
      q(2, 'What is your unfair advantage?', 'Whether the moat is real or a list of features. "We move fast" is not an advantage.'),
      q(2, 'What has to go right for this to be a big company?', 'Whether you know your own critical assumption.'),
      q(3, 'Is this a feature, not a company? Why will an incumbent not just ship it?', 'The most common killer. Answer the question rather than reframing it.'),
      q(3, 'Why now? Why did this not exist three years ago?', 'Whether there is a real enabling change or just enthusiasm.'),
      q(3, 'Your growth flattened last quarter. What happened?', 'Whether you volunteer bad news cleanly. Evasion here costs more than the number did.'),
      q(3, 'You are small. Why would a large customer trust you?', 'Whether you have an actual answer — a reference, a pilot structure, an insurance story.'),
      q(3, 'What keeps you up at night?', 'Whether you name a real risk or perform humility about a fake one.'),
      q(4, 'Tell me the story of your first customer, start to finish.', 'The most revealing question in the meeting. How you sold, what nearly killed it, why they stayed.'),
      q(4, 'Where is this in five years, and what did it take to get there?', 'Whether the vision has a mechanism attached or is only a size.'),
    ],
  }),

  pack({
    id: 'conference-talk',
    label: 'Conference talk / demo',
    blurb:
      'Deliver a prepared talk track from memory. Scores coverage of your beats plus delivery, and rewards sounding spoken over sounding recited.',
    mode: 'script',
    topic: '[Talk title] — [event], [length] minutes',
    targetSeconds: 120,
    greenZoneSeconds: 100,
    notes: `${NOTES_HEADER}
- Who is in the room and what they already know. A talk tuned to the wrong altitude fails.
- The one thing you want them to remember if they forget everything else.
- The demo steps, if there is a demo, and what you say while it loads.
- Your hard time limit, and what you cut first if you are running long.

Paste the talk itself into the Script box below, not here.`,
    questions: [
      q(1, 'Deliver your opening. Stop after the first sixty seconds.', 'Whether the first minute earns the next twenty. Most talks are lost here.'),
      q(1, 'Deliver your script from memory. Do not read it.', 'Coverage of every beat while still sounding like a person talking.'),
      q(2, 'Deliver it, but open with a different first sentence than the one you wrote.', 'Whether you can improvise inside your own structure or are reciting.'),
      q(2, 'Your demo just failed. Keep talking for ninety seconds.', 'The single most useful rehearsal there is. Silence is what the audience remembers.'),
      q(3, 'Deliver the whole thing in half the time. Keep every load-bearing point.', 'What you actually think matters, revealed by what you cut.'),
      q(3, 'Someone asks a hostile question in the middle. Answer it and get back on track.', 'Whether you can absorb an interruption without losing the thread.'),
      q(4, 'Deliver it as if the audience is sceptical and short on time.', 'Register control. Same content, different room.'),
      q(4, 'Give the closing. Land it.', 'Whether it ends or just stops.'),
    ],
  }),

  pack({
    id: 'everyday-impromptu',
    label: 'Everyday impromptu',
    blurb:
      'Cold-start speaking on any topic. Scores you on whether the first sentence answered the question and whether you got to a point inside a minute.',
    mode: 'impromptu',
    topic: '[Any subject you want to be able to talk about without preparing]',
    targetSeconds: 60,
    greenZoneSeconds: 45,
    notes: `${NOTES_HEADER}
- The subject, and roughly what you actually believe about it.
- Two or three concrete examples or stories you could reach for.

This mode works fine with an empty knowledge base — the point is structure under a cold
start, not recall. Fill it in when you want the coach to catch a claim you cannot support.`,
    questions: [
      q(1, 'Explain this to someone who has never heard of it.', 'Whether you can drop the jargon without losing the substance.'),
      q(1, 'What first got you interested in it?', 'Warm-up. A story, not a résumé line.'),
      q(1, 'What is the most common misconception about it?', 'Whether you know the field well enough to know what outsiders get wrong.'),
      q(2, 'What is overrated about it right now?', 'Whether you have an opinion or only a summary.'),
      q(2, 'If you had to bet on one change over the next two years, what is it?', 'Commitment. Hedging is the failure mode.'),
      q(2, 'Who is getting this right, and what are they doing differently?', 'Specificity — a named example beats a category.'),
      q(3, 'Argue the opposite of what you believe.', 'Whether you understand the other side well enough to state it fairly.'),
      q(3, 'What would have to be true for you to be completely wrong?', 'Intellectual honesty under a friendly question.'),
      q(3, 'What does everyone in this field agree on that is probably false?', 'Whether you can hold a contrarian position without being contrarian.'),
      q(4, 'Tell a story about a moment this changed how you think.', 'A narrative with a turn in it.'),
      q(4, 'Describe the best explanation of this you have ever heard, and why it worked.', 'Meta-awareness of what makes an explanation land.'),
    ],
  }),
]

export const PACK_BY_ID: Record<string, PrepPack> = Object.fromEntries(PACKS.map((p) => [p.id, p]))
