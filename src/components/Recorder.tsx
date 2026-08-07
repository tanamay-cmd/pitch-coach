'use client'

import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  playbackUrl?: string
  mirror: boolean
  recordVideo: boolean
  elapsed: number
  targetSeconds: number
  greenZoneSeconds: number
  recording: boolean
}

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function Recorder({
  stream,
  playbackUrl,
  mirror,
  recordVideo,
  elapsed,
  targetSeconds,
  greenZoneSeconds,
  recording,
}: Props) {
  const liveRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = liveRef.current
    if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream
  }, [stream])

  const pct = Math.min(100, (elapsed / targetSeconds) * 100)
  const zone = elapsed <= greenZoneSeconds ? 'ok' : elapsed <= targetSeconds ? 'warn' : 'bad'
  const barColor =
    zone === 'ok' ? 'var(--color-ok)' : zone === 'warn' ? 'var(--color-warn)' : 'var(--color-bad)'
  const zoneLabel =
    zone === 'ok' ? 'green zone' : zone === 'warn' ? 'wrap it up' : 'over — you would be cut off'

  // Playback replaces the live preview once a take is finished, so you can watch it back
  // in the same frame you recorded in.
  const showPlayback = Boolean(playbackUrl) && !recording

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
        {showPlayback ? (
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            playsInline
            className={`h-full w-full object-cover ${mirror && recordVideo ? 'mirror' : ''}`}
          />
        ) : (
          <video
            ref={liveRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${mirror ? 'mirror' : ''}`}
          />
        )}

        {!stream && !showPlayback && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--color-muted)]">
            {recordVideo
              ? 'Camera off. Press Start answering to open it.'
              : 'Audio-only mode. Press Start answering to open the mic.'}
          </div>
        )}

        {recording && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--color-bad)]" />
            REC
          </div>
        )}
        {showPlayback && (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs">Watch back</div>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full transition-[width,background] duration-200"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="mt-1.5 font-mono text-xs text-[var(--color-muted)]">
        {fmt(elapsed)} · {zoneLabel} · green ends at {fmt(greenZoneSeconds)}, target {fmt(targetSeconds)}
      </div>
    </div>
  )
}
