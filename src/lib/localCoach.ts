/**
 * The no-API-key path. Everything here runs in the browser off the locally measured
 * metrics, so the app is still useful with no key, offline, or when a request fails.
 *
 * It scores delivery honestly and says plainly that it cannot judge content — that is
 * the part that needs a model.
 */

import type { Analysis, Metrics, ModeId } from './types'
import { MODE_BY_ID } from './modes'

function paceScore(wpm: number, reliable: boolean): { score: number; comment: string } {
  if (!reliable) return { score: 0, comment: 'Pace not measurable — the transcript was typed or edited after the take.' }
  if (wpm === 0) return { score: 0, comment: 'Too short to measure pace.' }
  if (wpm < 90) return { score: 60, comment: `${wpm} wpm — slow enough that attention drifts. Aim for 110-150.` }
  if (wpm < 110) return { score: 78, comment: `${wpm} wpm — a touch slow, but deliberate reads as confident.` }
  if (wpm <= 150) return { score: 95, comment: `${wpm} wpm — right in the calm zone.` }
  if (wpm <= 170) return { score: 75, comment: `${wpm} wpm — quick. Land the ends of sentences.` }
  return { score: 55, comment: `${wpm} wpm — nervous-fast. Pause instead of accelerating.` }
}

function fillerScore(count: number, words: number): { score: number; comment: string } {
  if (words < 20) return { score: 0, comment: 'Too short to judge fillers.' }
  const per100 = (count / words) * 100
  if (count <= 2) return { score: 95, comment: `${count} fillers — clean.` }
  if (per100 <= 2) return { score: 80, comment: `${count} fillers. Noticeable but not distracting.` }
  if (per100 <= 4) return { score: 62, comment: `${count} fillers. The fix is a silent pause, not a faster start.` }
  return { score: 40, comment: `${count} fillers — this is the loudest thing in the answer. Pause instead.` }
}

function lengthScore(dur: number, target: number): { score: number; comment: string } {
  const ratio = dur / target
  if (ratio < 0.4) return { score: 45, comment: `${dur}s against a ${target}s target — under-answered.` }
  if (ratio < 0.7) return { score: 72, comment: `${dur}s — short. There was room for one more concrete detail.` }
  if (ratio <= 1.1) return { score: 95, comment: `${dur}s — on target.` }
  if (ratio <= 1.4) return { score: 70, comment: `${dur}s against a ${target}s target — ran long. Cut the setup.` }
  return { score: 45, comment: `${dur}s — well over. In a real room you would have been cut off.` }
}

export function localAnalysis(
  mode: ModeId,
  question: string,
  transcript: string,
  metrics: Metrics,
  targetSeconds: number,
): Analysis {
  const pace = paceScore(metrics.wordsPerMinute, metrics.paceReliable)
  const filler = fillerScore(metrics.fillerCount, metrics.words)
  const length = lengthScore(metrics.durationSec, targetSeconds)

  const structureHits = [metrics.openedWithAnswer, metrics.hasConcreteExample, metrics.endedWithPoint]
  const structureScore = Math.round((structureHits.filter(Boolean).length / 3) * 100)

  const dimensions = [
    {
      name: 'Structure',
      score: structureScore,
      comment: [
        metrics.openedWithAnswer ? 'Opened on the answer.' : 'First sentence did not answer the question.',
        metrics.hasConcreteExample ? 'Had a concrete example or number.' : 'No specific example or number.',
        metrics.endedWithPoint ? 'Closed on a point.' : 'Trailed off rather than landing a point.',
      ].join(' '),
    },
    // An unmeasurable pace is left out entirely rather than scored zero — averaging in a
    // 0 for something we simply could not observe would misreport the whole take.
    ...(metrics.paceReliable ? [{ name: 'Pace', score: pace.score, comment: pace.comment }] : []),
    { name: 'Fillers', score: filler.score, comment: filler.comment },
    { name: 'Length discipline', score: length.score, comment: length.comment },
  ]

  if (metrics.scriptCoverage !== undefined) {
    dimensions.unshift({
      name: 'Script coverage',
      score: metrics.scriptCoverage,
      comment: metrics.missedScriptPoints?.length
        ? `Missed: ${metrics.missedScriptPoints.slice(0, 3).map((p) => `"${p}"`).join('; ')}`
        : 'Every beat landed.',
    })
  }

  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)

  const strengths: string[] = []
  if (metrics.openedWithAnswer) strengths.push('Your first sentence answered the question instead of warming up.')
  if (metrics.hasConcreteExample) strengths.push('You reached for a specific example rather than a generality.')
  if (metrics.endedWithPoint) strengths.push('You closed on a point instead of trailing off.')
  if (pace.score >= 90) strengths.push(`Pace was steady at ${metrics.wordsPerMinute} wpm.`)
  if (filler.score >= 90) strengths.push(`Only ${metrics.fillerCount} fillers — that is hard to do live.`)
  if (metrics.longestMonologueRun >= 40)
    strengths.push(`You strung together ${metrics.longestMonologueRun} words without a filler.`)
  if (!strengths.length) strengths.push('You got through a full take on camera. That is the rep that counts.')

  const fixes: Analysis['fixes'] = []
  if (!metrics.openedWithAnswer)
    fixes.push({
      issue: 'The answer did not start with the answer.',
      instead: `Open by restating the ask and resolving it: "${question.replace(/\?$/, '')} — the short version is ..." then back-fill.`,
    })
  if (!metrics.hasConcreteExample)
    fixes.push({
      issue: 'No specific example, name, or number.',
      instead: 'Name one real instance: the project, the system, the number, or the person. Specifics are what get remembered.',
    })
  if (!metrics.endedWithPoint)
    fixes.push({
      issue: 'The answer stopped rather than landed.',
      instead: 'Finish with one sentence starting "which matters because ..." and then stop talking.',
    })
  if (filler.score < 80)
    fixes.push({
      issue: `${metrics.fillerCount} filler words${metrics.fillersFound[0] ? ` — mostly "${metrics.fillersFound[0].word}"` : ''}.`,
      instead: 'Replace each one with a closed-mouth pause. Silence sounds like thinking; "um" sounds like searching.',
    })
  if (length.score < 75) fixes.push({ issue: length.comment, instead: `Re-run the same question aiming for ${targetSeconds}s.` })
  if (!metrics.echoedQuestion)
    fixes.push({
      issue: 'You never repeated the question back.',
      instead: 'Echoing a few of the asker\'s own words buys you thinking time and proves you heard them.',
    })

  const formula = MODE_BY_ID[mode].formula

  return {
    overallScore,
    headline: `${overallScore}/100 on delivery. Content was not scored — add an Anthropic key in Settings for that.`,
    dimensions,
    strengths,
    fixes,
    modelAnswer: `No model answer without an API key. Aim for the shape: ${formula}`,
    followUpQuestion: 'Run the same question again and try to beat this score.',
    source: 'local',
  }
}
