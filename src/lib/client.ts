'use client'

import type { Analysis, CoachRequest, KeyStatus, Metrics, ModeId, Question, Settings } from './types'
import { MODE_BY_ID } from './modes'
import { MODE_RUBRICS, render, type PromptSet } from './prompts'
import { metricsToText } from './metrics'

export class CoachError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'CoachError'
  }
}

async function post(body: CoachRequest, apiKey: string): Promise<{ data: unknown; model: string }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  // The key travels per request over https and is never stored server-side.
  if (apiKey.trim()) headers['x-anthropic-key'] = apiKey.trim()

  const res = await fetch('/api/coach', { method: 'POST', headers, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => ({}))) as {
    data?: unknown
    model?: string
    error?: string
    message?: string
  }

  if (!res.ok) throw new CoachError(json.error ?? 'http_' + res.status, json.message ?? `Request failed (${res.status}).`)
  return { data: json.data, model: json.model ?? '' }
}

export async function fetchKeyStatus(): Promise<KeyStatus> {
  try {
    const res = await fetch('/api/coach')
    if (!res.ok) return { serverKey: false, model: 'claude-opus-5' }
    return (await res.json()) as KeyStatus
  } catch {
    return { serverKey: false, model: 'claude-opus-5' }
  }
}

export interface Ctx {
  mode: ModeId
  topic: string
  knowledge: string
  script: string
  settings: Settings
  prompts: PromptSet
}

/** The rendered pair actually sent to the API. Also what the Preview tab displays. */
export interface RenderedPrompt {
  system: string
  user: string
}

function baseVars(ctx: Ctx): Record<string, string | number> {
  const mode = MODE_BY_ID[ctx.mode]
  return {
    mode: ctx.mode,
    mode_label: mode.label,
    formula: mode.formula,
    topic: ctx.topic.trim() || '(not specified — keep questions general)',
    knowledge: ctx.knowledge.trim() || '(none provided)',
    target_seconds: ctx.settings.targetSeconds,
  }
}

/**
 * Prompt assembly lives here, separate from sending, so the Preview tab and the
 * clipboard button show byte-for-byte what the request will contain. If these ever
 * diverge, the preview is lying.
 */
export function buildQuestionPrompt(ctx: Ctx, level: number, count: number): RenderedPrompt {
  const vars = { ...baseVars(ctx), level, count }
  return {
    system: render(ctx.prompts.questionSystem, vars),
    user: render(ctx.prompts.questionUser, vars),
  }
}

export function buildAnalyzePrompt(
  ctx: Ctx,
  question: string,
  transcript: string,
  metrics: Metrics,
): RenderedPrompt {
  const scriptBlock =
    ctx.mode === 'script' && ctx.script.trim() ? `SCRIPT THEY WERE DELIVERING\n${ctx.script.trim()}` : ''

  const vars = {
    ...baseVars(ctx),
    question,
    transcript,
    metrics: metricsToText(metrics),
    script: scriptBlock,
  }

  return {
    system: `${render(ctx.prompts.analyzeSystem, vars)}\n\n${MODE_RUBRICS[ctx.mode]}`,
    user: render(ctx.prompts.analyzeUser, vars),
  }
}

export async function generateQuestions(ctx: Ctx, level: number, count: number): Promise<Question[]> {
  const { system, user } = buildQuestionPrompt(ctx, level, count)
  const body: CoachRequest = {
    action: 'questions',
    mode: ctx.mode,
    topic: ctx.topic,
    knowledge: ctx.knowledge,
    level,
    count,
    systemPrompt: system,
    userPrompt: user,
    model: ctx.settings.model,
    // Question generation is a much lighter lift than analysis; no need to burn
    // the analysis effort level on it.
    effort: ctx.settings.effort === 'max' || ctx.settings.effort === 'xhigh' ? 'high' : ctx.settings.effort,
  }
  const { data } = await post(body, ctx.settings.apiKey)
  const parsed = data as { questions?: { text: string; probing: string }[] }
  if (!parsed?.questions?.length) throw new CoachError('empty', 'No questions came back.')
  return parsed.questions.map((q) => ({ level, text: q.text, probing: q.probing }))
}

export async function analyzeTake(
  ctx: Ctx,
  question: string,
  transcript: string,
  metrics: Metrics,
): Promise<Analysis> {
  const { system, user } = buildAnalyzePrompt(ctx, question, transcript, metrics)

  const body: CoachRequest = {
    action: 'analyze',
    mode: ctx.mode,
    topic: ctx.topic,
    knowledge: ctx.knowledge,
    question,
    transcript,
    metrics,
    script: ctx.script,
    targetSeconds: ctx.settings.targetSeconds,
    systemPrompt: system,
    userPrompt: user,
    model: ctx.settings.model,
    effort: ctx.settings.effort,
  }

  const { data, model } = await post(body, ctx.settings.apiKey)
  const a = data as Omit<Analysis, 'source' | 'model'>
  return { ...a, source: 'claude', model }
}
