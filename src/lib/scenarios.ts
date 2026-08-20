/**
 * Server-side loader for researched scenario packs.
 *
 * A scenario is a directory under `scenarios/` written by the prep agents in `agents/`:
 *
 *   scenarios/<id>/research.md    phase 1 — the raw dossier, with sources
 *   scenarios/<id>/briefing.md    phase 2 — the readable report (mirrors pack.briefing)
 *   scenarios/<id>/pack.json      the machine-readable pack the app actually loads
 *
 * `pack.json` is the source of truth; `briefing.md` is the same content rendered for
 * reading on GitHub. Files are read at request time rather than bundled, so dropping a
 * new scenario folder in makes it appear on the next reload with no rebuild — which is
 * the whole point of running the agents locally.
 *
 * Every pack is validated before it is served. A malformed scenario is skipped with a
 * reason rather than taking down the packs list, because these files are generated.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Briefing, ModeId, PrepPack, Question, RubricDimension } from './types'

const SCENARIOS_DIR = path.join(process.cwd(), 'scenarios')
const MODES: ModeId[] = ['interview', 'impromptu', 'pitch', 'script']
const WEIGHTS: RubricDimension['weight'][] = ['high', 'medium', 'low']

export interface ScenarioLoadResult {
  packs: PrepPack[]
  /** Directories that looked like scenarios but did not validate, with the reason. */
  skipped: { id: string; reason: string }[]
}

class InvalidPack extends Error {}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new InvalidPack(`"${field}" must be a non-empty string`)
  return v
}

function num(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new InvalidPack(`"${field}" must be a positive number`)
  }
  return v
}

function arr(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new InvalidPack(`"${field}" must be an array`)
  return v
}

function strArray(v: unknown, field: string): string[] {
  return arr(v, field).map((item, i) => str(item, `${field}[${i}]`))
}

function parseQuestions(v: unknown): Question[] {
  const questions = arr(v, 'questions').map((raw, i) => {
    const o = raw as Record<string, unknown>
    const level = num(o.level, `questions[${i}].level`)
    if (![1, 2, 3, 4].includes(level)) throw new InvalidPack(`questions[${i}].level must be 1-4`)
    return { level, text: str(o.text, `questions[${i}].text`), probing: str(o.probing, `questions[${i}].probing`) }
  })
  if (!questions.length) throw new InvalidPack('"questions" is empty — a pack with no questions cannot be practised')
  return questions
}

function parseBriefing(v: unknown): Briefing {
  const o = v as Record<string, unknown>
  return {
    headline: str(o.headline, 'briefing.headline'),
    format: str(o.format, 'briefing.format'),
    whyTheyAsk: arr(o.whyTheyAsk, 'briefing.whyTheyAsk').map((raw, i) => {
      const t = raw as Record<string, unknown>
      return { theme: str(t.theme, `briefing.whyTheyAsk[${i}].theme`), why: str(t.why, `briefing.whyTheyAsk[${i}].why`) }
    }),
    rubric: arr(o.rubric, 'briefing.rubric').map((raw, i) => {
      const d = raw as Record<string, unknown>
      const weight = str(d.weight, `briefing.rubric[${i}].weight`) as RubricDimension['weight']
      if (!WEIGHTS.includes(weight)) throw new InvalidPack(`briefing.rubric[${i}].weight must be high|medium|low`)
      return {
        name: str(d.name, `briefing.rubric[${i}].name`),
        weight,
        good: str(d.good, `briefing.rubric[${i}].good`),
        bad: str(d.bad, `briefing.rubric[${i}].bad`),
      }
    }),
    strongAnswer: strArray(o.strongAnswer, 'briefing.strongAnswer'),
    weakAnswer: strArray(o.weakAnswer, 'briefing.weakAnswer'),
    traps: arr(o.traps, 'briefing.traps').map((raw, i) => {
      const t = raw as Record<string, unknown>
      return { trap: str(t.trap, `briefing.traps[${i}].trap`), instead: str(t.instead, `briefing.traps[${i}].instead`) }
    }),
    prepPlan: strArray(o.prepPlan, 'briefing.prepPlan'),
    sources: arr(o.sources, 'briefing.sources').map((raw, i) => {
      const s = raw as Record<string, unknown>
      return {
        title: str(s.title, `briefing.sources[${i}].title`),
        url: str(s.url, `briefing.sources[${i}].url`),
        supports: str(s.supports, `briefing.sources[${i}].supports`),
      }
    }),
  }
}

/** Throws `InvalidPack` with the offending field rather than returning a half-built pack. */
export function parsePack(raw: unknown, dirId: string): PrepPack {
  if (typeof raw !== 'object' || raw === null) throw new InvalidPack('pack.json is not an object')
  const o = raw as Record<string, unknown>

  const mode = str(o.mode, 'mode') as ModeId
  if (!MODES.includes(mode)) throw new InvalidPack(`"mode" must be one of ${MODES.join(', ')}`)

  // The directory name wins over an `id` in the file — the folder is what you actually
  // renamed, and a mismatch would silently break the "already loaded" indicator.
  return {
    id: dirId,
    label: str(o.label, 'label'),
    blurb: str(o.blurb, 'blurb'),
    mode,
    topic: str(o.topic, 'topic'),
    targetSeconds: num(o.targetSeconds, 'targetSeconds'),
    greenZoneSeconds: num(o.greenZoneSeconds, 'greenZoneSeconds'),
    notes: typeof o.notes === 'string' ? o.notes : '',
    questions: parseQuestions(o.questions),
    briefing: o.briefing === undefined ? undefined : parseBriefing(o.briefing),
    origin: 'scenario',
    researchedOn: typeof o.researchedOn === 'string' ? o.researchedOn : undefined,
  }
}

export async function loadScenarios(): Promise<ScenarioLoadResult> {
  let entries
  try {
    entries = await readdir(SCENARIOS_DIR, { withFileTypes: true })
  } catch {
    // No scenarios/ directory at all is the normal state of a fresh clone, not an error.
    return { packs: [], skipped: [] }
  }

  const packs: PrepPack[] = []
  const skipped: { id: string; reason: string }[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    const file = path.join(SCENARIOS_DIR, entry.name, 'pack.json')
    try {
      packs.push(parsePack(JSON.parse(await readFile(file, 'utf8')), entry.name))
    } catch (err) {
      // ENOENT means the folder is mid-generation — phase 1 has run, phase 2 has not.
      const reason =
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'no pack.json yet — the prep pipeline has not finished phase 2'
          : err instanceof Error
            ? err.message
            : String(err)
      skipped.push({ id: entry.name, reason })
    }
  }

  packs.sort((a, b) => a.label.localeCompare(b.label))
  return { packs, skipped }
}
