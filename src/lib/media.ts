/**
 * Camera + mic capture. Safari and Chrome disagree on container formats, so the mime
 * type is negotiated rather than hard-coded — passing an unsupported one to
 * MediaRecorder throws on Safari.
 */

const VIDEO_CANDIDATES = [
  'video/mp4;codecs=avc1',      // Safari (macOS + iOS)
  'video/mp4',
  'video/webm;codecs=vp9,opus', // Chrome
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const AUDIO_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']

export function pickMimeType(withVideo: boolean): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = withVideo ? VIDEO_CANDIDATES : AUDIO_CANDIDATES
  return candidates.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t)
    } catch {
      return false
    }
  })
}

export interface CaptureHandles {
  stream: MediaStream
  recorder: MediaRecorder | null
  chunks: Blob[]
}

export interface CameraResult {
  stream: MediaStream
  /** True when video was requested but no camera exists, so we silently retried audio-only. */
  fellBackToAudio: boolean
}

/** getUserMedia error names that mean "no such device" rather than "permission denied". */
const NO_DEVICE_ERRORS = new Set(['NotFoundError', 'OverconstrainedError', 'DevicesNotFoundError'])

export async function openCamera(withVideo: boolean): Promise<CameraResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      `This browser will not expose the ${withVideo ? 'camera' : 'microphone'}. On iOS and macOS this usually means the page is not on https:// or localhost.`,
    )
  }
  const audio = { echoCancellation: true, noiseSuppression: true }
  if (!withVideo) {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio, video: false }), fellBackToAudio: false }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    })
    return { stream, fellBackToAudio: false }
  } catch (e) {
    // No camera on this machine — practising by voice is still the point of the app,
    // so fall back rather than dead-ending on a device error.
    if (e instanceof Error && NO_DEVICE_ERRORS.has(e.name)) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })
      return { stream, fellBackToAudio: true }
    }
    throw e
  }
}

export function startRecorder(stream: MediaStream, withVideo: boolean): CaptureHandles {
  const chunks: Blob[] = []
  let recorder: MediaRecorder | null = null
  const mimeType = pickMimeType(withVideo)
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.start(1000)
  } catch {
    // No MediaRecorder (older iOS) — the live preview and transcript still work,
    // there is just no playback afterwards.
    recorder = null
  }
  return { stream, recorder, chunks }
}

export function stopRecorder(h: CaptureHandles): Promise<{ url: string; type: string } | null> {
  return new Promise((resolve) => {
    if (!h.recorder || h.recorder.state === 'inactive') {
      resolve(null)
      return
    }
    h.recorder.onstop = () => {
      if (!h.chunks.length) {
        resolve(null)
        return
      }
      const type = h.recorder?.mimeType || h.chunks[0].type || 'video/mp4'
      const blob = new Blob(h.chunks, { type })
      resolve({ url: URL.createObjectURL(blob), type })
    }
    try {
      h.recorder.stop()
    } catch {
      resolve(null)
    }
  })
}

export function closeStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}
