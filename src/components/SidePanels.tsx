'use client'

import { useRef, useState } from 'react'
import { DEFAULT_PROMPTS, PROMPT_VARIABLES, usedVariables, type PromptSet } from '@/lib/prompts'
import { importFile } from '@/lib/files'
import type { KnowledgeDoc, PrepPack, Settings } from '@/lib/types'

/* ---------------------------------- Settings --------------------------------- */

export function SettingsPanel({
  settings,
  onChange,
  serverKey,
  speechOk,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  serverKey: boolean
  speechOk: boolean
}) {
  const [reveal, setReveal] = useState(false)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v })

  return (
    <div className="space-y-5">
      <section>
        <label className="mb-1.5 block text-sm font-medium">Anthropic API key</label>
        <div className="flex gap-2">
          <input
            className="field font-mono text-[13px]"
            type={reveal ? 'text' : 'password'}
            placeholder={serverKey ? 'Optional — this deployment has its own key' : 'sk-ant-...'}
            value={settings.apiKey}
            onChange={(e) => set('apiKey', e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn shrink-0" onClick={() => setReveal((r) => !r)}>
            {reveal ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
          {serverKey
            ? 'This deployment already has a server key, so AI coaching works without pasting anything. Add your own key here to bill your account instead of the deployment owner’s.'
            : 'Stored only in this browser’s localStorage and sent on each request. Without a key the app still records, transcribes, and scores your delivery locally — it just cannot judge content.'}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-muted)]">
          Get one at{' '}
          <a
            className="text-[var(--color-accent)] underline"
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            console.anthropic.com
          </a>
          .
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Model</label>
          <input className="field text-[13px]" value={settings.model} onChange={(e) => set('model', e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Effort</label>
          <select
            className="field text-[13px]"
            value={settings.effort}
            onChange={(e) => set('effort', e.target.value as Settings['effort'])}
          >
            <option value="low">low — fastest</option>
            <option value="medium">medium</option>
            <option value="high">high — default</option>
            <option value="xhigh">xhigh</option>
            <option value="max">max — slowest</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Target length (s)</label>
          <input
            className="field text-[13px]"
            type="number"
            min={15}
            max={600}
            value={settings.targetSeconds}
            onChange={(e) => set('targetSeconds', Math.max(15, Number(e.target.value) || 60))}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Green zone ends (s)</label>
          <input
            className="field text-[13px]"
            type="number"
            min={5}
            max={600}
            value={settings.greenZoneSeconds}
            onChange={(e) => set('greenZoneSeconds', Math.max(5, Number(e.target.value) || 45))}
          />
        </div>
      </section>

      <section>
        <label className="mb-1.5 block text-sm font-medium">Speech recognition language</label>
        <select
          className="field text-[13px]"
          value={settings.recognitionLang}
          onChange={(e) => set('recognitionLang', e.target.value)}
        >
          <option value="en-US">English (US)</option>
          <option value="en-IN">English (India)</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-AU">English (Australia)</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="hi-IN">Hindi</option>
        </select>
        {!speechOk && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-warn)]">
            This browser has no speech recognition. Recording and scoring still work — you will type or
            dictate the transcript yourself after each take. Chrome and Safari both support it.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.recordVideo}
            onChange={(e) => set('recordVideo', e.target.checked)}
          />
          Record video (uncheck for audio-only)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.mirror} onChange={(e) => set('mirror', e.target.checked)} />
          Mirror the preview
        </label>
      </section>
    </div>
  )
}

/* ------------------------------- Knowledge base ------------------------------ */

export function KnowledgePanel({
  notes,
  onNotes,
  docs,
  onDocs,
  script,
  onScript,
  showScript,
  onLoadPack,
  loadedPackId,
  packs,
  skipped,
}: {
  notes: string
  onNotes: (v: string) => void
  docs: KnowledgeDoc[]
  onDocs: (d: KnowledgeDoc[]) => void
  script: string
  onScript: (v: string) => void
  showScript: boolean
  onLoadPack: (id: string) => void
  loadedPackId: string | null
  /** Researched packs from scenarios/ followed by the built-in ones. */
  packs: PrepPack[]
  /** Scenario folders that failed to parse, surfaced so a bad pack.json is not silent. */
  skipped: { id: string; reason: string }[]
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError('')
    const added: KnowledgeDoc[] = []
    for (const file of Array.from(files)) {
      try {
        added.push(await importFile(file))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    if (added.length) onDocs([...docs, ...added])
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const totalChars = docs.reduce((s, d) => s + d.chars, 0) + notes.length

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-3">
        <label className="mb-1.5 block text-sm font-medium">Prep packs</label>
        <p className="mb-2 text-[12px] leading-relaxed text-[var(--color-muted)]">
          Loads a whole practice setup at once: mode, topic, grounding notes, question list,
          and timing. Everything stays editable afterwards.
        </p>
        <div className="space-y-1.5">
          {packs.map((p) => (
            <div key={p.id} className="rounded-md bg-[#101014] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[13px] font-medium">
                  {p.label}
                  {p.origin === 'scenario' && (
                    <span className="ml-1.5 rounded-full border border-[var(--color-accent)]/50 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[var(--color-accent)]">
                      researched
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className={`btn shrink-0 !px-2 !py-0.5 !text-[11px] ${loadedPackId === p.id ? '' : 'btn-primary'}`}
                  onClick={() => onLoadPack(p.id)}
                >
                  {loadedPackId === p.id ? 'Reload' : 'Load'}
                </button>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">{p.blurb}</p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                {p.questions.length} questions · {p.targetSeconds}s target
                {p.briefing ? ' · briefing + rubric' : ''}
              </p>
            </div>
          ))}
        </div>

        {skipped.length > 0 && (
          <div className="mt-2 rounded-md border border-[var(--color-bad)]/50 bg-[var(--color-bad)]/10 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bad)]">
              {skipped.length} scenario{skipped.length === 1 ? '' : 's'} not loaded
            </p>
            <ul className="mt-1 space-y-0.5">
              {skipped.map((sk) => (
                <li key={sk.id} className="text-[11px] leading-relaxed text-[var(--color-muted)]">
                  <code className="font-mono">scenarios/{sk.id}</code> — {sk.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          Built-in packs are generic scenarios. For one researched against a real company and
          round — its questions, its rubric, its traps — run{' '}
          <code className="font-mono text-[var(--color-accent)]">/prep &lt;scenario&gt;</code> in
          Claude Code, then reload.
        </p>

        {loadedPackId && (
          <p className="mt-2 text-[12px] text-[var(--color-warn)]">
            Loading a pack overwrites Topic and Notes. Copy anything you want to keep first.
          </p>
        )}
      </section>

      <section>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <textarea
          className="field min-h-[140px] text-[13px] leading-relaxed"
          placeholder={
            'Anything the coach should treat as ground truth: your background, the company, the product, ' +
            'the metrics you are allowed to cite, the JD you are interviewing against.\n\n' +
            'The coach will not invent facts that are not in here.'
          }
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
        />
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="text-sm font-medium">Files</label>
          <span className="text-[11px] text-[var(--color-muted)]">
            {docs.length} file{docs.length === 1 ? '' : 's'} · {(totalChars / 1000).toFixed(1)}k chars
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.json,.csv,.yaml,.yml,.pdf,text/*"
          className="block w-full text-[12px] text-[var(--color-muted)] file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-[var(--color-line)] file:bg-[#202027] file:px-3 file:py-1.5 file:text-[12px] file:text-[#ececef]"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={busy}
        />
        <p className="mt-1 text-[12px] text-[var(--color-muted)]">
          .txt, .md, .csv, .json, .pdf. Text-layer PDFs only — a scanned one has nothing to read.
        </p>
        {busy && <p className="mt-2 text-[12px] text-[var(--color-accent)]">Reading…</p>}
        {error && <p className="mt-2 text-[12px] text-[var(--color-bad)]">{error}</p>}

        {docs.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-md bg-[#101014] px-2.5 py-1.5">
                <span className="truncate text-[13px]">{d.name}</span>
                <span className="shrink-0 text-[11px] text-[var(--color-muted)]">
                  {(d.chars / 1000).toFixed(1)}k
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[var(--color-bad)] hover:opacity-70"
                  onClick={() => onDocs(docs.filter((x) => x.id !== d.id))}
                  aria-label={`Remove ${d.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showScript && (
        <section>
          <label className="mb-1.5 block text-sm font-medium">Script</label>
          <textarea
            className="field min-h-[160px] text-[13px] leading-relaxed"
            placeholder="Paste the script or talk track you are rehearsing. Coverage is scored beat by beat, not word for word."
            value={script}
            onChange={(e) => onScript(e.target.value)}
          />
        </section>
      )}
    </div>
  )
}

/* -------------------------------- Prompt studio ------------------------------ */

const PROMPT_FIELDS: { key: keyof PromptSet; label: string; note: string }[] = [
  { key: 'questionSystem', label: 'Question generator — system', note: 'Who the asker is and how questions should feel.' },
  { key: 'questionUser', label: 'Question generator — user', note: 'The actual ask. Runs once per “New questions”.' },
  { key: 'analyzeSystem', label: 'Coach — system', note: 'The rubric and standards. The mode rubric is appended automatically.' },
  { key: 'analyzeUser', label: 'Coach — user', note: 'The take itself: question, transcript, measured delivery.' },
]

export function PromptStudio({
  prompts,
  onChange,
}: {
  prompts: PromptSet
  onChange: (p: PromptSet) => void
}) {
  const [open, setOpen] = useState<keyof PromptSet>('analyzeSystem')

  const dirty = (Object.keys(DEFAULT_PROMPTS) as (keyof PromptSet)[]).some(
    (k) => prompts[k] !== DEFAULT_PROMPTS[k],
  )
  const known = new Set(PROMPT_VARIABLES.map((v) => v.name))
  const unknownVars = usedVariables(prompts[open]).filter((v) => !known.has(v))

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
        These are the exact prompts sent to Claude. Edit them for your own coaching style — a harsher
        rubric, a different question persona, a language other than English. Saved in this browser.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn !px-2.5 !py-1 !text-xs ${open === f.key ? '!border-[var(--color-accent)] !text-[var(--color-accent)]' : ''}`}
            onClick={() => setOpen(f.key)}
          >
            {f.label}
            {prompts[f.key] !== DEFAULT_PROMPTS[f.key] && <span className="ml-1 text-[var(--color-accent)]">•</span>}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[12px] text-[var(--color-muted)]">
          {PROMPT_FIELDS.find((f) => f.key === open)?.note}
        </p>
        <textarea
          className="field min-h-[300px] font-mono text-[12px] leading-relaxed"
          value={prompts[open]}
          onChange={(e) => onChange({ ...prompts, [open]: e.target.value })}
          spellCheck={false}
        />
        {unknownVars.length > 0 && (
          <p className="mt-1.5 text-[12px] text-[var(--color-warn)]">
            Unknown variable{unknownVars.length > 1 ? 's' : ''}: {unknownVars.map((v) => `{{${v}}}`).join(', ')} — these
            render as empty text.
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Variables
        </h4>
        <div className="scroll-x">
          <table className="w-full min-w-[380px] text-[12px]">
            <tbody>
              {PROMPT_VARIABLES.map((v) => (
                <tr key={v.name} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-1 pr-3 font-mono text-[var(--color-accent)]">{`{{${v.name}}}`}</td>
                  <td className="py-1 text-[var(--color-muted)]">{v.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        className="btn !text-xs"
        disabled={!dirty}
        onClick={() => onChange({ ...DEFAULT_PROMPTS })}
      >
        Reset all prompts to defaults
      </button>
    </div>
  )
}
