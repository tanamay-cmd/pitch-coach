'use client'

import type { Briefing, PrepPack } from '@/lib/types'

/**
 * Phase 2 of the prep pipeline, rendered for the candidate: what this round is, why they
 * ask what they ask, the rubric you are actually scored against, what separates a strong
 * answer from a weak one, and the traps.
 *
 * Read this before you practise. The same rubric is injected into the coaching prompt, so
 * the score you get on a take is against these dimensions rather than the generic ones.
 */

const WEIGHT_TONE: Record<Briefing['rubric'][number]['weight'], string> = {
  high: 'var(--color-bad)',
  medium: 'var(--color-warn)',
  low: 'var(--color-muted)',
}

function Section({ title, tone, children }: { title: string; tone?: string; children: React.ReactNode }) {
  return (
    <section>
      <h4
        className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: tone ?? 'var(--color-muted)' }}
      >
        {title}
      </h4>
      {children}
    </section>
  )
}

export default function BriefingPanel({
  pack,
  onLoadPack,
  isLoaded,
}: {
  pack: PrepPack | null
  onLoadPack: (id: string) => void
  isLoaded: boolean
}) {
  if (!pack?.briefing) {
    return (
      <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
        <p>
          No briefing. Built-in packs are generic scenarios, so there is nothing researched to
          report — pick a researched scenario from the Knowledge tab, or generate one.
        </p>
        <div className="rounded-lg border border-[var(--color-line)] bg-[#101014] p-3">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Generate one
          </p>
          <p className="mb-2">In Claude Code, from the project root:</p>
          <pre className="scroll-x rounded-md bg-[#0a0a0d] p-2 font-mono text-[11px] text-[#ececef]">
            /prep system design interview at Amazon
          </pre>
          <p className="mt-2">
            Three agents run in order — research, briefing, questions — and write{' '}
            <code className="font-mono text-[12px] text-[var(--color-accent)]">scenarios/&lt;id&gt;/</code>. Reload
            this page and the pack appears in the Knowledge tab.
          </p>
        </div>
      </div>
    )
  }

  const b = pack.briefing

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug">{pack.label}</h3>
          <button
            type="button"
            className={`btn shrink-0 !px-2.5 !py-1 !text-[11px] ${isLoaded ? '' : 'btn-primary'}`}
            onClick={() => onLoadPack(pack.id)}
          >
            {isLoaded ? 'Reload pack' : 'Load pack'}
          </button>
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed">{b.headline}</p>
        {pack.researchedOn && (
          <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
            Researched {pack.researchedOn}. Interview loops change — re-run the pipeline if this
            has gone stale.
          </p>
        )}
      </div>

      <Section title="What the round looks like">
        <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">{b.format}</p>
      </Section>

      {b.whyTheyAsk.length > 0 && (
        <Section title="Why they ask what they ask">
          <dl className="space-y-2.5">
            {b.whyTheyAsk.map((w, i) => (
              <div key={i}>
                <dt className="text-[13px] font-medium">{w.theme}</dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-muted)]">{w.why}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {b.rubric.length > 0 && (
        <Section title="The rubric you are scored on">
          <p className="mb-2.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
            These dimensions are sent to the coach with every take, so your score is against this
            rubric — not the generic one.
          </p>
          <div className="space-y-3">
            {b.rubric.map((d, i) => (
              <div key={i} className="rounded-lg border border-[var(--color-line)] bg-[#101014] p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium">{d.name}</span>
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: WEIGHT_TONE[d.weight] }}
                  >
                    {d.weight} weight
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed">
                  <span className="font-semibold text-[var(--color-ok)]">Strong: </span>
                  <span className="text-[var(--color-muted)]">{d.good}</span>
                </p>
                <p className="mt-1 text-[12px] leading-relaxed">
                  <span className="font-semibold text-[var(--color-bad)]">Weak: </span>
                  <span className="text-[var(--color-muted)]">{d.bad}</span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {b.strongAnswer.length > 0 && (
        <Section title="What a good answer does" tone="var(--color-ok)">
          <ul className="space-y-1.5">
            {b.strongAnswer.map((s, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                <span className="mr-2 text-[var(--color-ok)]">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.weakAnswer.length > 0 && (
        <Section title="What a bad answer does" tone="var(--color-bad)">
          <ul className="space-y-1.5">
            {b.weakAnswer.map((s, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                <span className="mr-2 text-[var(--color-bad)]">✗</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.traps.length > 0 && (
        <Section title="Traps" tone="var(--color-warn)">
          <ol className="space-y-2.5">
            {b.traps.map((t, i) => (
              <li key={i}>
                <div className="flex gap-2 text-[13px] leading-relaxed">
                  <span className="text-[var(--color-warn)]">{i + 1}.</span>
                  <span>{t.trap}</span>
                </div>
                <p className="mt-1 rounded-md bg-[#101014] p-2 text-[12px] leading-relaxed">
                  <span className="mr-1.5 font-semibold text-[var(--color-accent)]">Instead:</span>
                  {t.instead}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {b.prepPlan.length > 0 && (
        <Section title="Before you practise">
          <ol className="space-y-1.5">
            {b.prepPlan.map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="shrink-0 font-mono text-[var(--color-accent)]">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {b.sources.length > 0 && (
        <Section title="Sources">
          <ul className="space-y-2">
            {b.sources.map((s, i) => (
              <li key={i} className="text-[12px] leading-relaxed">
                <a
                  className="text-[var(--color-accent)] underline"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.title}
                </a>
                <p className="text-[var(--color-muted)]">{s.supports}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            Researched from public reports. Treat it as well-sourced hearsay, not policy — the
            company never published most of it.
          </p>
        </Section>
      )}
    </div>
  )
}
