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

export async function openCamera(withVideo: boolean): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'This browser will not expose the camera. On iOS and macOS this usually means the page is not on https:// or localhost.',
    )
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: withVideo
      ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      : false,
  })
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
