'use client'

import { useMemo, useState } from 'react'
import { buildAnalyzePrompt, buildQuestionPrompt, type Ctx, type RenderedPrompt } from '@/lib/client'
import { MODE_BY_ID } from '@/lib/modes'
import type { Metrics, Take } from '@/lib/types'

type Which = 'questions' | 'coach'

/**
 * Shows the exact prompt the app will send, with every variable substituted. Both
 * halves come from the same builders the request path uses, so what you read here
 * is what goes over the wire — and what lands on your clipboard.
 */
export default function PreviewPanel({
  ctx,
  level,
  take,
  onNotice,
}: {
  ctx: Ctx
  level: number
  take: Take | null
  onNotice: (msg: string) => void
}) {
  const [which, setWhich] = useState<Which>('questions')
  const [showKnowledge, setShowKnowledge] = useState(false)

  const questionPrompt = useMemo(() => buildQuestionPrompt(ctx, level, 6), [ctx, level])
  const coachPrompt = useMemo(
    () => (take ? buildAnalyzePrompt(ctx, take.question, take.transcript, take.metrics) : null),
    [ctx, take],
  )

  const active: RenderedPrompt | null = which === 'questions' ? questionPrompt : coachPrompt
  const combined = active ? `${active.system}\n\n---\n\n${active.user}` : ''
  const chars = combined.length
  const modeDef = MODE_BY_ID[ctx.mode]

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
        The exact request the app sends, fully substituted. Copy it into Claude, ChatGPT, or a
        scratch file — or just read it to check the coach is seeing what you think it is.
      </p>

      {/* Context at a glance — the things that feed the {{variables}} */}
      <div className="rounded-lg border border-[var(--color-line)] bg-[#101014] p-3">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Context being sent
        </h4>
        <dl className="space-y-1.5 text-[12px]">
          <Row k="Mode" v={modeDef.label} />
          <Row k="Formula" v={modeDef.formula} />
          <Row k="Topic" v={ctx.topic.trim() || <em className="text-[var(--color-bad)]">not set</em>} />
          <Row k="Target" v={`${ctx.settings.targetSeconds}s`} />
          <Row k="Model" v={`${ctx.settings.model} · effort ${ctx.settings.effort}`} />
          <Row
            k="Knowledge"
            v={
              ctx.knowledge.trim() ? (
                <button
                  type="button"
                  className="text-[var(--color-accent)] underline"
                  onClick={() => setShowKnowledge((s) => !s)}
                >
                  {(ctx.knowledge.length / 1000).toFixed(1)}k chars — {showKnowledge ? 'hide' : 'show'}
                </button>
              ) : (
                <em className="text-[var(--color-muted)]">none</em>
              )
            }
          />
          {ctx.mode === 'script' && (
            <Row
              k="Script"
              v={ctx.script.trim() ? `${(ctx.script.length / 1000).toFixed(1)}k chars` : <em className="text-[var(--color-bad)]">not set</em>}
            />
          )}
        </dl>
        {showKnowledge && (
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-[#0a0a0d] p-2 font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
            {ctx.knowledge}
          </pre>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`btn !px-2.5 !py-1 !text-xs ${which === 'questions' ? '!border-[var(--color-accent)] !text-[var(--color-accent)]' : ''}`}
          onClick={() => setWhich('questions')}
        >
          Question prompt
        </button>
        <button
          type="button"
          className={`btn !px-2.5 !py-1 !text-xs ${which === 'coach' ? '!border-[var(--color-accent)] !text-[var(--color-accent)]' : ''}`}
          onClick={() => setWhich('coach')}
        >
          Coaching prompt
          {!take && <span className="ml-1 text-[var(--color-muted)]">needs a take</span>}
        </button>
      </div>

      {!active ? (
        <p className="rounded-lg border border-[var(--color-line)] bg-[#101014] p-3 text-[13px] text-[var(--color-muted)]">
          Record a take first — the coaching prompt needs a question, a transcript, and measured
          delivery before it can be assembled.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary !px-2.5 !py-1 !text-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(combined)
                onNotice('Full prompt copied — system and user, exactly as sent.')
              }}
            >
              Copy whole prompt
            </button>
            <button
              type="button"
              className="btn !px-2.5 !py-1 !text-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(active.system)
                onNotice('System prompt copied.')
              }}
            >
              System only
            </button>
            <button
              type="button"
              className="btn !px-2.5 !py-1 !text-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(active.user)
                onNotice('User prompt copied.')
              }}
            >
              User only
            </button>
            <span className="text-[11px] text-[var(--color-muted)]">
              {chars.toLocaleString()} chars · ~{Math.ceil(chars / 3.8).toLocaleString()} tokens
            </span>
          </div>

          <Block label="System" text={active.system} />
          <Block label="User" text={active.user} />
        </>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-[var(--color-muted)]">{k}</dt>
      <dd className="min-w-0 flex-1 break-words">{v}</dd>
    </div>
  )
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </h4>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-line)] bg-[#0a0a0d] p-2.5 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

/** Every locally measured signal, not just the four headline tiles. */
export function MetricsDetail({ m, targetSeconds }: { m: Metrics; targetSeconds: number }) {
  const flag = (ok: boolean) => (ok ? 'var(--color-ok)' : 'var(--color-bad)')
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Duration', value: `${m.durationSec}s against a ${targetSeconds}s target` },
    { label: 'Words', value: m.words },
    {
      label: 'Pace',
      value: m.paceReliable ? (
        `${m.wordsPerMinute} wpm (110–150 is the calm zone)`
      ) : (
        <span className="text-[var(--color-warn)]">
          not measurable — transcript was typed or edited, so it does not match the recording length
        </span>
      ),
    },
    {
      label: 'Fillers',
      value: m.fillersFound.length
        ? `${m.fillerCount} — ${m.fillersFound.map((f) => `"${f.word}" ×${f.count}`).join(', ')}`
        : `${m.fillerCount}`,
    },
    { label: 'Longest clean run', value: `${m.longestMonologueRun} words without a filler` },
    {
      label: 'First sentence answered it',
      value: <span style={{ color: flag(m.openedWithAnswer) }}>{m.openedWithAnswer ? 'yes' : 'no'}</span>,
    },
    {
      label: 'Repeated the question',
      value: <span style={{ color: flag(m.echoedQuestion) }}>{m.echoedQuestion ? 'yes' : 'no'}</span>,
    },
    {
      label: 'Concrete example or number',
      value: <span style={{ color: flag(m.hasConcreteExample) }}>{m.hasConcreteExample ? 'yes' : 'no'}</span>,
    },
    {
      label: 'Closed on a point',
      value: <span style={{ color: flag(m.endedWithPoint) }}>{m.endedWithPoint ? 'yes' : 'no'}</span>,
    },
  ]

  if (m.scriptCoverage !== undefined) {
    rows.push({ label: 'Script coverage', value: `${m.scriptCoverage}% of beats hit` })
    if (m.missedScriptPoints?.length) {
      rows.push({
        label: 'Beats missed',
        value: (
          <ul className="space-y-0.5">
            {m.missedScriptPoints.map((p, i) => (
              <li key={i} className="text-[var(--color-bad)]">
                “{p}”
              </li>
            ))}
          </ul>
        ),
      })
    }
  }

  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        All measured signals
      </summary>
      <dl className="mt-3 space-y-2 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3">
            <dt className="w-48 shrink-0 text-[var(--color-muted)]">{r.label}</dt>
            <dd className="min-w-0 flex-1">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-[12px] leading-relaxed text-[var(--color-muted)]">
        Measured in your browser from the transcript — these are handed to the coach as fact, so it
        scores content rather than re-deriving delivery.
      </p>
    </details>
  )
}
