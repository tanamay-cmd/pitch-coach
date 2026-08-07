import type { Metrics } from './types'

const FILLERS = [
  'um',
  'uh',
  'erm',
  'ah',
  'like',
  'you know',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'i mean',
  'right',
  'so yeah',
  'obviously',
]

/** Words that signal the speaker is about to give a concrete instance rather than a generality. */
const EXAMPLE_MARKERS = [
  'for example',
  'for instance',
  'last year',
  'last month',
  'at my',
  'when i',
  'we built',
  'i built',
  'i led',
  'i shipped',
  'one time',
  'specifically',
  'in practice',
]

/** Words that signal a closing point rather than trailing off. */
const POINT_MARKERS = [
  'which means',
  'so the',
  'the takeaway',
  'that matters because',
  'the point is',
  'net net',
  'bottom line',
  'in short',
  'so what',
  "that's why",
  'that is why',
  'the reason',
]

const HEDGES = ['maybe', 'i guess', 'i think probably', 'sort of', 'kind of', 'not really sure']

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countPhrase(haystack: string, phrase: string): number {
  if (!phrase) return 0
  // Word-boundary match so "like" does not fire inside "likely".
  const re = new RegExp(`(?<![\\w'])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'])`, 'g')
  return (haystack.match(re) || []).length
}

/** Content words from the question, minus stopwords — used for echo detection. */
function keyTerms(question: string): string[] {
  const stop = new Set([
    'what','why','how','when','where','who','the','a','an','is','are','do','does','did','you',
    'your','to','of','in','on','for','and','or','with','about','that','this','it','me','tell',
    'give','can','could','would','should','have','has','had','be','been','was','were','as','at',
    'from','by','if','we','they','their','my','i','most','more','one','out','up','so','not',
  ])
  return normalise(question)
    .split(' ')
    .filter((w) => w.length > 3 && !stop.has(w))
}

export function computeMetrics(
  transcript: string,
  question: string,
  durationSec: number,
  script?: string,
): Metrics {
  const norm = normalise(transcript)
  const words = norm ? norm.split(' ').filter(Boolean) : []
  const wordCount = words.length

  const fillersFound = FILLERS.map((f) => ({ word: f, count: countPhrase(norm, f) })).filter(
    (f) => f.count > 0,
  )
  const fillerCount = fillersFound.reduce((sum, f) => sum + f.count, 0)

  const terms = keyTerms(question)
  const matched = terms.filter((t) => norm.includes(t))
  const echoedQuestion = terms.length > 0 && matched.length / terms.length >= 0.34

  // "Opened with the answer" = the question's key terms show up in roughly the first sentence.
  const opener = words.slice(0, 30).join(' ')
  const openedWithAnswer =
    terms.length > 0 && terms.some((t) => opener.includes(t)) && !/^(so|um|uh|well|yeah|okay|right)\b/.test(opener)

  const hasConcreteExample =
    EXAMPLE_MARKERS.some((m) => norm.includes(m)) || /\b\d+(\.\d+)?\s*(percent|%|x|k|m|users|people|ms|hours|days|weeks|months|years)\b/.test(norm)

  const tail = words.slice(-45).join(' ')
  const endedWithPoint = POINT_MARKERS.some((m) => tail.includes(m)) && !HEDGES.some((h) => tail.endsWith(h))

  // Longest run of words without a filler — a proxy for fluent stretches.
  let longestMonologueRun = 0
  let run = 0
  for (const w of words) {
    if (FILLERS.includes(w)) {
      longestMonologueRun = Math.max(longestMonologueRun, run)
      run = 0
    } else {
      run++
    }
  }
  longestMonologueRun = Math.max(longestMonologueRun, run)

  const metrics: Metrics = {
    durationSec: Math.round(durationSec * 10) / 10,
    words: wordCount,
    wordsPerMinute: durationSec > 3 ? Math.round(wordCount / (durationSec / 60)) : 0,
    fillerCount,
    fillersFound: fillersFound.sort((a, b) => b.count - a.count),
    echoedQuestion,
    openedWithAnswer,
    hasConcreteExample,
    endedWithPoint,
    longestMonologueRun,
  }

  if (script && script.trim()) {
    const points = scriptKeyPoints(script)
    const missed = points.filter((p) => !p.terms.some((t) => norm.includes(t)))
    metrics.scriptCoverage = points.length ? Math.round(((points.length - missed.length) / points.length) * 100) : undefined
    metrics.missedScriptPoints = missed.slice(0, 8).map((p) => p.line)
  }

  return metrics
}

/** Split a script into beats and pull the distinctive terms from each. */
function scriptKeyPoints(script: string): { line: string; terms: string[] }[] {
  return script
    .split(/[\n.!?]+/)
    .map((l) => l.trim())
    .filter((l) => l.split(' ').length >= 4)
    .map((line) => ({ line, terms: keyTerms(line).slice(0, 4) }))
    .filter((p) => p.terms.length > 0)
}

/** Compact, model-readable rendering of the metrics for the analyze prompt. */
export function metricsToText(m: Metrics): string {
  const lines = [
    `Duration: ${m.durationSec}s`,
    `Words: ${m.words}`,
    `Pace: ${m.wordsPerMinute} words/min (110-150 is the calm zone; above 170 reads as nervous-fast)`,
    `Fillers: ${m.fillerCount}${m.fillersFound.length ? ` (${m.fillersFound.map((f) => `${f.word} x${f.count}`).join(', ')})` : ''}`,
    `Repeated the question back: ${m.echoedQuestion ? 'yes' : 'no'}`,
    `First sentence answered it: ${m.openedWithAnswer ? 'yes' : 'no'}`,
    `Concrete example or number present: ${m.hasConcreteExample ? 'yes' : 'no'}`,
    `Closed on a point rather than trailing off: ${m.endedWithPoint ? 'yes' : 'no'}`,
    `Longest filler-free run: ${m.longestMonologueRun} words`,
  ]
  if (m.scriptCoverage !== undefined) {
    lines.push(`Script coverage: ${m.scriptCoverage}% of beats hit`)
    if (m.missedScriptPoints?.length) {
      lines.push(`Beats missed: ${m.missedScriptPoints.map((p) => `"${p}"`).join('; ')}`)
    }
  }
  return lines.join('\n')
}
