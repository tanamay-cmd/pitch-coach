'use client'

import type { Analysis, Metrics } from '@/lib/types'

function scoreColor(score: number): string {
  if (score >= 85) return 'var(--color-ok)'
  if (score >= 65) return 'var(--color-warn)'
  return 'var(--color-bad)'
}

function Stat({ n, label, tone }: { n: string | number; label: string; tone?: string }) {
  return (
    <div className="card px-3 py-2 text-center">
      <div className="text-lg font-semibold" style={tone ? { color: tone } : undefined}>
        {n}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
    </div>
  )
}

export function MetricsRow({ m, targetSeconds }: { m: Metrics; targetSeconds: number }) {
  const paceTone =
    m.wordsPerMinute === 0
      ? undefined
      : m.wordsPerMinute >= 110 && m.wordsPerMinute <= 150
        ? 'var(--color-ok)'
        : m.wordsPerMinute > 170 || m.wordsPerMinute < 90
          ? 'var(--color-bad)'
          : 'var(--color-warn)'
  const fillerTone =
    m.fillerCount <= 2 ? 'var(--color-ok)' : m.fillerCount <= 5 ? 'var(--color-warn)' : 'var(--color-bad)'
  const lenTone =
    m.durationSec <= targetSeconds * 1.1 && m.durationSec >= targetSeconds * 0.6
      ? 'var(--color-ok)'
      : 'var(--color-warn)'

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat n={`${m.durationSec}s`} label="Duration" tone={lenTone} />
      <Stat n={m.wordsPerMinute || '–'} label="Words/min" tone={paceTone} />
      <Stat n={m.fillerCount} label="Fillers" tone={fillerTone} />
      {m.scriptCoverage !== undefined ? (
        <Stat n={`${m.scriptCoverage}%`} label="Script covered" tone={scoreColor(m.scriptCoverage)} />
      ) : (
        <Stat
          n={m.openedWithAnswer ? 'Yes' : 'No'}
          label="Opened on answer"
          tone={m.openedWithAnswer ? 'var(--color-ok)' : 'var(--color-bad)'}
        />
      )}
    </div>
  )
}

export default function FeedbackPanel({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-bold" style={{ color: scoreColor(analysis.overallScore) }}>
            {analysis.overallScore}
          </span>
          <span className="text-sm text-[var(--color-muted)]">/ 100</span>
          <span className="ml-auto rounded-full border border-[var(--color-line)] px-2.5 py-0.5 text-[11px] text-[var(--color-muted)]">
            {analysis.source === 'claude' ? analysis.model || 'Claude' : 'local scoring — no key'}
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed">{analysis.headline}</p>
      </div>

      {analysis.dimensions.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Breakdown
          </h3>
          <div className="space-y-3">
            {analysis.dimensions.map((d) => (
              <div key={d.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="font-mono text-sm" style={{ color: scoreColor(d.score) }}>
                    {d.score}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, d.score))}%`, background: scoreColor(d.score) }}
                  />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">{d.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.strengths.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-ok)]">
            What worked
          </h3>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-[14px] leading-relaxed">
                <span className="mr-2 text-[var(--color-ok)]">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.fixes.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-warn)]">
            Fix these first
          </h3>
          <ol className="space-y-4">
            {analysis.fixes.map((f, i) => (
              <li key={i}>
                <div className="flex gap-2 text-[14px] font-medium leading-relaxed">
                  <span className="text-[var(--color-warn)]">{i + 1}.</span>
                  <span>{f.issue}</span>
                </div>
                {f.quote?.trim() && (
                  <blockquote className="mt-2 border-l-2 border-[var(--color-line)] pl-3 text-[13px] italic text-[var(--color-muted)]">
                    “{f.quote}”
                  </blockquote>
                )}
                <p className="mt-2 rounded-md bg-[#101014] p-2.5 text-[13px] leading-relaxed">
                  <span className="mr-1.5 font-semibold text-[var(--color-accent)]">Say instead:</span>
                  {f.instead}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {analysis.modelAnswer && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Model answer
            </h3>
            <button
              type="button"
              className="btn !px-2.5 !py-1 !text-xs"
              onClick={() => void navigator.clipboard?.writeText(analysis.modelAnswer)}
            >
              Copy
            </button>
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{analysis.modelAnswer}</p>
        </div>
      )}

      {analysis.followUpQuestion && (
        <div className="card border-[var(--color-accent)]/40 p-4">
          <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Practise next
          </h3>
          <p className="text-[15px] leading-relaxed">{analysis.followUpQuestion}</p>
        </div>
      )}
    </div>
  )
}
