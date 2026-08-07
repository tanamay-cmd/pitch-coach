/**
 * Web Speech API wrapper.
 *
 * Support reality, which drives every design choice here:
 *  - Chrome/Edge on macOS: works well, `continuous` is honoured.
 *  - Safari on macOS and iOS (14.5+): works, but the engine stops on its own after a
 *    pause and ignores `continuous`. So we restart it ourselves until the caller stops,
 *    and we accumulate finals across restarts rather than trusting one session.
 *  - Firefox: no support at all — the caller falls back to typing the transcript.
 */

type Listener = (finalText: string, interimText: string) => void

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return getCtor() !== null
}

export class Transcriber {
  private rec: SpeechRecognitionLike | null = null
  private finalText = ''
  private interimText = ''
  private running = false
  private listener: Listener
  private lang: string
  /** Set when the caller asked to stop, so `onend` does not restart us. */
  private stopping = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  constructor(lang: string, listener: Listener) {
    this.lang = lang
    this.listener = listener
  }

  start() {
    const Ctor = getCtor()
    if (!Ctor) return false
    this.finalText = ''
    this.interimText = ''
    this.stopping = false
    this.running = true
    this.spin(Ctor)
    return true
  }

  private spin(Ctor: SpeechRecognitionCtor) {
    const rec = new Ctor()
    this.rec = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = this.lang
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          this.finalText += (this.finalText ? ' ' : '') + chunk.trim()
        } else {
          interim += chunk
        }
      }
      this.interimText = interim
      this.listener(this.finalText, this.interimText)
    }

    rec.onerror = (e) => {
      // `no-speech` and `aborted` are routine mid-take; only a permission or service
      // failure is worth giving up on.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.running = false
        this.stopping = true
      }
    }

    rec.onend = () => {
      if (this.stopping || !this.running) return
      // Safari ends the session on every pause. Restart on the next tick — an immediate
      // synchronous restart throws InvalidStateError.
      this.restartTimer = setTimeout(() => {
        if (!this.stopping && this.running) {
          try {
            this.spin(Ctor)
          } catch {
            /* the engine is wedged; the caller can still type the transcript */
          }
        }
      }, 150)
    }

    try {
      rec.start()
    } catch {
      /* already started — harmless */
    }
  }

  stop(): string {
    this.stopping = true
    this.running = false
    if (this.restartTimer) clearTimeout(this.restartTimer)
    try {
      this.rec?.stop()
    } catch {
      /* not started */
    }
    this.rec = null
    // Interim text is usually a partial word at the moment of stopping; keeping it
    // makes the last sentence read complete.
    const combined = [this.finalText, this.interimText].filter(Boolean).join(' ').trim()
    return combined
  }
}
