'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Recorder from './Recorder'
import FeedbackPanel, { MetricsRow } from './FeedbackPanel'
import { KnowledgePanel, PromptStudio, SettingsPanel } from './SidePanels'
import { LEVEL_LABELS, MODES, MODE_BY_ID } from '@/lib/modes'
import { computeMetrics, metricsToText } from '@/lib/metrics'
import { coachingPrompt, localAnalysis } from '@/lib/localCoach'
import { buildKnowledge } from '@/lib/files'
import { Transcriber, speechSupported } from '@/lib/speech'
import { closeStream, openCamera, startRecorder, stopRecorder, type CaptureHandles } from '@/lib/media'
import { CoachError, analyzeTake, fetchKeyStatus, generateQuestions } from '@/lib/client'
import * as store from '@/lib/storage'
import type { Analysis, KnowledgeDoc, Metrics, ModeId, Question, Settings, Take } from '@/lib/types'
import { DEFAULT_PROMPTS, type PromptSet } from '@/lib/prompts'

type Tab = 'knowledge' | 'prompts' | 'settings' | 'history'

export default function CoachApp() {
  /* ------------------------------- persisted state ------------------------------ */
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(store.DEFAULT_SETTINGS)
  const [prompts, setPrompts] = useState<PromptSet>(DEFAULT_PROMPTS)
  const [notes, setNotes] = useState('')
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [script, setScript] = useState('')
  const [mode, setMode] = useState<ModeId>('impromptu')
  const [topic, setTopic] = useState('')
  const [takes, setTakes] = useState<Take[]>([])

  /* --------------------------------- session state ------------------------------ */
  const [serverKey, setServerKey] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [level, setLevel] = useState(2)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [currentTake, setCurrentTake] = useState<Take | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('knowledge')

  const captureRef = useRef<CaptureHandles | null>(null)
  const transcriberRef = useRef<Transcriber | null>(null)
  const startedAtRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speechOk = useMemo(() => (ready ? speechSupported() : true), [ready])

  /* ---------------------------------- bootstrap --------------------------------- */
  useEffect(() => {
    setSettings(store.loadSettings())
    setPrompts(store.loadPrompts())
    setNotes(store.loadNotes())
    setDocs(store.loadDocs())
    setScript(store.loadScript())
    setTakes(store.loadTakes())
    setReady(true)
    void fetchKeyStatus().then((s) => {
      setServerKey(s.serverKey)
      // Adopt the deployment's configured model unless the user has already picked one.
      setSettings((prev) => (prev.model === store.DEFAULT_SETTINGS.model ? { ...prev, model: s.model } : prev))
    })
  }, [])

  useEffect(() => {
    if (ready) setTopic(store.loadTopic(mode))
  }, [mode, ready])

  // Persist on change, but only after bootstrap so we never write defaults over real data.
  useEffect(() => { if (ready) store.saveSettings(settings) }, [settings, ready])
  useEffect(() => { if (ready) store.savePrompts(prompts) }, [prompts, ready])
  useEffect(() => { if (ready) store.saveNotes(notes) }, [notes, ready])
  useEffect(() => { if (ready) store.saveDocs(docs) }, [docs, ready])
  useEffect(() => { if (ready) store.saveScript(script) }, [script, ready])
  useEffect(() => { if (ready) store.saveTakes(takes) }, [takes, ready])
  useEffect(() => { if (ready) store.saveTopic(mode, topic) }, [topic, mode, ready])

  // Switching mode retargets the timer to that mode's natural length.
  const changeMode = (m: ModeId) => {
    setMode(m)
    setQuestions([])
    setQIndex(0)
    setCurrentTake(null)
    const target = MODE_BY_ID[m].defaultTargetSeconds
    setSettings((s) => ({ ...s, targetSeconds: target, greenZoneSeconds: Math.round(target * 0.75) }))
    if (m === 'script') setTab('knowledge')
  }

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      closeStream(captureRef.current?.stream ?? null)
    }
  }, [])

  const knowledge = useMemo(() => buildKnowledge(notes, docs), [notes, docs])
  const currentQuestion = questions[qIndex]
  const modeDef = MODE_BY_ID[mode]
  const hasKey = Boolean(settings.apiKey.trim()) || serverKey

  const ctx = useMemo(
    () => ({ mode, topic, knowledge, script, settings, prompts }),
    [mode, topic, knowledge, script, settings, prompts],
  )

  /* --------------------------------- questions ---------------------------------- */

  const loadQuestions = useCallback(async () => {
    setError('')
    setNotice('')
    setCurrentTake(null)
    if (!hasKey) {
      // No key: fall back to the built-in bank, with {{topic}} substituted.
      const t = topic.trim() || 'this topic'
      const pool = modeDef.fallbackQuestions
        .filter((q) => q.level === level)
        .map((q) => ({ level: q.level, text: q.text.replaceAll('{{topic}}', t) }))
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      setQuestions(shuffled.length ? shuffled : modeDef.fallbackQuestions.map((q) => ({ ...q, text: q.text.replaceAll('{{topic}}', t) })))
      setQIndex(0)
      setNotice('Using the built-in question bank. Add an API key in Settings for questions written from your topic and knowledge base.')
      return
    }
    setLoadingQuestions(true)
    try {
      const qs = await generateQuestions(ctx, level, 6)
      setQuestions(qs)
      setQIndex(0)
    } catch (e) {
      setError(e instanceof CoachError ? e.message : 'Could not generate questions.')
      // Still give them something to practise with rather than a dead end.
      const t = topic.trim() || 'this topic'
      setQuestions(
        modeDef.fallbackQuestions
          .filter((q) => q.level === level)
          .map((q) => ({ level: q.level, text: q.text.replaceAll('{{topic}}', t) })),
      )
      setQIndex(0)
    } finally {
      setLoadingQuestions(false)
    }
  }, [ctx, hasKey, level, modeDef, topic])

  /* ---------------------------------- recording --------------------------------- */

  async function start() {
    setError('')
    setNotice('')
    setCurrentTake(null)
    setLiveTranscript('')
    setInterim('')
    try {
      const s = await openCamera(settings.recordVideo)
      setStream(s)
      captureRef.current = startRecorder(s, settings.recordVideo)
      if (!captureRef.current.recorder) {
        setNotice('This browser will not record playback, but the timer, transcript, and scoring all still work.')
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} On iOS and macOS, camera access needs https:// or localhost, and permission must be granted for this site.`
          : 'Could not open the camera.',
      )
      return
    }

    if (speechSupported()) {
      const t = new Transcriber(settings.recognitionLang, (fin, int) => {
        setLiveTranscript(fin)
        setInterim(int)
      })
      transcriberRef.current = t
      t.start()
    }

    startedAtRef.current = Date.now()
    setElapsed(0)
    setRecording(true)
    tickRef.current = setInterval(() => setElapsed((Date.now() - startedAtRef.current) / 1000), 200)
  }

  async function stop() {
    if (tickRef.current) clearInterval(tickRef.current)
    const durationSec = (Date.now() - startedAtRef.current) / 1000
    setRecording(false)

    const finalTranscript = transcriberRef.current?.stop() ?? liveTranscript
    transcriberRef.current = null
    setLiveTranscript(finalTranscript)
    setInterim('')

    const media = captureRef.current ? await stopRecorder(captureRef.current) : null
    closeStream(captureRef.current?.stream ?? null)
    captureRef.current = null
    setStream(null)

    const question = currentQuestion?.text ?? ''
    const metrics = computeMetrics(finalTranscript, question, durationSec, mode === 'script' ? script : undefined)

    setCurrentTake({
      id: `${Date.now()}`,
      createdAt: Date.now(),
      mode,
      topic,
      question,
      transcript: finalTranscript,
      metrics,
      mediaUrl: media?.url,
      mediaType: media?.type,
    })
    setElapsed(durationSec)
  }

  /* ---------------------------------- analysis ---------------------------------- */

  /** Recompute metrics from whatever transcript is on screen — it may have been edited by hand. */
  function refreshedTake(take: Take): Take {
    const metrics = computeMetrics(
      take.transcript,
      take.question,
      take.metrics.durationSec,
      take.mode === 'script' ? script : undefined,
    )
    return { ...take, metrics }
  }

  async function analyze() {
    if (!currentTake) return
    const take = refreshedTake(currentTake)
    if (!take.transcript.trim()) {
      setError('There is no transcript to score. Type or dictate what you said into the transcript box first.')
      return
    }
    setError('')
    setAnalyzing(true)

    const commit = (analysis: Analysis) => {
      const scored = { ...take, analysis }
      setCurrentTake(scored)
      setTakes((prev) => [scored, ...prev.filter((t) => t.id !== scored.id)].slice(0, 50))
    }

    if (!hasKey) {
      commit(localAnalysis(take.mode, take.question, take.transcript, take.metrics, settings.targetSeconds))
      setNotice('Scored locally. Delivery only — add an API key in Settings to have Claude judge the content.')
      setAnalyzing(false)
      return
    }

    try {
      commit(await analyzeTake(ctx, take.question, take.transcript, take.metrics))
    } catch (e) {
      const msg = e instanceof CoachError ? e.message : 'Analysis failed.'
      setError(`${msg} Falling back to local delivery scoring.`)
      commit(localAnalysis(take.mode, take.question, take.transcript, take.metrics, settings.targetSeconds))
    } finally {
      setAnalyzing(false)
    }
  }

  function copyForClaude() {
    if (!currentTake) return
    const take = refreshedTake(currentTake)
    void navigator.clipboard
      ?.writeText(
        coachingPrompt(
          modeDef.label,
          modeDef.formula,
          topic,
          take.question,
          take.transcript,
          metricsToText(take.metrics),
          settings.targetSeconds,
        ),
      )
      .then(() => setNotice('Coaching prompt copied. Paste it into Claude, or anywhere else.'))
  }

  /* ------------------------------------ render ---------------------------------- */

  const transcriptDisplay = recording ? `${liveTranscript}${interim ? ` ${interim}` : ''}` : currentTake?.transcript ?? ''

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Pitch Coach</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
          Answer on camera. Get scored on what you actually said.
          <span className="ml-2 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[11px]">
            {hasKey ? (serverKey && !settings.apiKey.trim() ? 'AI coaching · server key' : 'AI coaching · your key') : 'local scoring only'}
          </span>
        </p>
      </header>

      {/* Mode picker */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={recording}
            className={`btn !px-3 !py-1.5 !text-[13px] ${mode === m.id ? '!border-[var(--color-accent)] !bg-[var(--color-accent)] !text-[#17120c]' : ''}`}
            onClick={() => changeMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-muted)]">{modeDef.blurb}</p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------- left column ------------------------------ */}
        <div className="min-w-0 space-y-4">
          <div className="card p-4">
            <label className="mb-1.5 block text-sm font-medium">Topic or role</label>
            <input
              className="field text-[14px]"
              placeholder={modeDef.topicPlaceholder}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={recording}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="field !w-auto !py-1.5 text-[13px]"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                disabled={recording}
              >
                {[1, 2, 3, 4].map((l) => (
                  <option key={l} value={l}>
                    Level {l} · {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary !text-[13px]"
                onClick={() => void loadQuestions()}
                disabled={loadingQuestions || recording}
              >
                {loadingQuestions ? 'Writing questions…' : questions.length ? 'New questions' : 'Get questions'}
              </button>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="btn !text-[13px]"
                  disabled={recording}
                  onClick={() => {
                    setQIndex((i) => (i + 1) % questions.length)
                    setCurrentTake(null)
                  }}
                >
                  Next question ({qIndex + 1}/{questions.length})
                </button>
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              {currentQuestion ? `Level ${currentQuestion.level} · ${LEVEL_LABELS[currentQuestion.level]}` : 'No question yet'}
            </div>
            <p className="mt-1.5 text-[17px] font-medium leading-snug">
              {currentQuestion?.text ?? 'Set a topic and press Get questions.'}
            </p>
            {currentQuestion?.probing && (
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)]">
                <span className="font-semibold">They are testing:</span> {currentQuestion.probing}
              </p>
            )}
            <p className="mt-3 border-t border-[var(--color-line)] pt-2.5 text-[13px] text-[var(--color-muted)]">
              <span className="font-semibold">Shape:</span> {modeDef.formula}
            </p>
          </div>

          <Recorder
            stream={stream}
            playbackUrl={currentTake?.mediaUrl}
            mirror={settings.mirror}
            recordVideo={settings.recordVideo}
            elapsed={elapsed}
            targetSeconds={settings.targetSeconds}
            greenZoneSeconds={settings.greenZoneSeconds}
            recording={recording}
          />

          <div className="flex flex-wrap gap-2">
            {!recording ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void start()}
                disabled={!currentQuestion}
              >
                Start answering
              </button>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => void stop()}>
                Stop
              </button>
            )}
            {currentTake && !recording && (
              <>
                <button type="button" className="btn btn-primary" onClick={() => void analyze()} disabled={analyzing}>
                  {analyzing ? 'Coaching…' : currentTake.analysis ? 'Re-score' : hasKey ? 'Get coaching' : 'Score delivery'}
                </button>
                <button type="button" className="btn" onClick={copyForClaude}>
                  Copy prompt for Claude
                </button>
                <button type="button" className="btn" onClick={() => void start()}>
                  Same question again
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--color-bad)]/50 bg-[var(--color-bad)]/10 p-3 text-[13px] leading-relaxed">
              {error}
            </div>
          )}
          {notice && !error && (
            <div className="rounded-lg border border-[var(--color-line)] bg-[#101014] p-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
              {notice}
            </div>
          )}

          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                What you said
              </h3>
              {!recording && currentTake && (
                <span className="text-[11px] text-[var(--color-muted)]">editable — fix mis-heard words before scoring</span>
              )}
            </div>
            {recording ? (
              <p className="min-h-[80px] text-[14px] leading-relaxed">
                {liveTranscript}
                {interim && <span className="text-[var(--color-muted)]"> {interim}</span>}
                {!transcriptDisplay && (
                  <span className="text-[var(--color-muted)]">
                    {speechOk ? 'Listening…' : 'No live transcription in this browser — you can type it in after you stop.'}
                  </span>
                )}
              </p>
            ) : (
              <textarea
                className="field min-h-[110px] text-[14px] leading-relaxed"
                placeholder={
                  currentTake
                    ? 'Nothing was transcribed. Type or dictate what you said, then score it.'
                    : 'Your transcript appears here after a take.'
                }
                value={currentTake?.transcript ?? ''}
                onChange={(e) => setCurrentTake((t) => (t ? { ...t, transcript: e.target.value } : t))}
                disabled={!currentTake}
              />
            )}
          </div>

          {currentTake && !recording && (
            <MetricsRow m={currentTake.metrics} targetSeconds={settings.targetSeconds} />
          )}

          {currentTake?.analysis && <FeedbackPanel analysis={currentTake.analysis} />}

          {currentTake && !recording && (
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Watch-back checklist
              </h3>
              <ul className="space-y-1 text-[13px] text-[var(--color-muted)]">
                <li>▢ Did my first sentence answer the question?</li>
                <li>▢ Did I use a specific story or number?</li>
                <li>▢ Did I end on a point instead of trailing off?</li>
                <li>▢ Was I looking at the lens, not at myself?</li>
                <li>▢ Did I pause instead of saying &ldquo;um&rdquo;?</li>
              </ul>
            </div>
          )}
        </div>

        {/* ------------------------------ right column ----------------------------- */}
        <aside className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['knowledge', 'prompts', 'settings', 'history'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn !px-2.5 !py-1 !text-xs capitalize ${tab === t ? '!border-[var(--color-accent)] !text-[var(--color-accent)]' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
                {t === 'history' && takes.length > 0 && (
                  <span className="ml-1 text-[var(--color-muted)]">{takes.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="card p-4">
            {tab === 'knowledge' && (
              <KnowledgePanel
                notes={notes}
                onNotes={setNotes}
                docs={docs}
                onDocs={setDocs}
                script={script}
                onScript={setScript}
                showScript={mode === 'script'}
              />
            )}
            {tab === 'prompts' && <PromptStudio prompts={prompts} onChange={setPrompts} />}
            {tab === 'settings' && (
              <SettingsPanel settings={settings} onChange={setSettings} serverKey={serverKey} speechOk={speechOk} />
            )}
            {tab === 'history' && (
              <div className="space-y-2">
                {takes.length === 0 && (
                  <p className="text-[13px] text-[var(--color-muted)]">
                    Scored takes land here. Video is not kept across reloads — only the transcript, metrics, and coaching.
                  </p>
                )}
                {takes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[#101014] p-2.5 text-left transition-colors hover:border-[var(--color-accent)]"
                    onClick={() => {
                      setCurrentTake(t)
                      setMode(t.mode)
                      setElapsed(t.metrics.durationSec)
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                        {MODE_BY_ID[t.mode].label} · {new Date(t.createdAt).toLocaleString()}
                      </span>
                      {t.analysis && (
                        <span className="font-mono text-[13px] font-semibold">{t.analysis.overallScore}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px]">{t.question || '(no question)'}</p>
                  </button>
                ))}
                {takes.length > 0 && (
                  <button
                    type="button"
                    className="btn !text-xs"
                    onClick={() => {
                      setTakes([])
                      setCurrentTake(null)
                    }}
                  >
                    Clear history
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
