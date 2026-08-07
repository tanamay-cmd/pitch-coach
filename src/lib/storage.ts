/**
 * Everything the app remembers lives in localStorage on the device: settings, the
 * API key, the knowledge base, custom prompts, and take history. Nothing is sent to
 * any server except the coaching request itself.
 */

import type { KnowledgeDoc, ModeId, Settings, Take } from './types'
import { DEFAULT_PROMPTS, type PromptSet } from './prompts'

const NS = 'pitchcoach:v1:'

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'claude-opus-5',
  effort: 'high',
  targetSeconds: 60,
  greenZoneSeconds: 45,
  recognitionLang: 'en-US',
  mirror: true,
  recordVideo: true,
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(NS + key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as object) } as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value))
  } catch {
    /* quota or private mode — settings just will not persist */
  }
}

export const loadSettings = (): Settings => read('settings', DEFAULT_SETTINGS)
export const saveSettings = (s: Settings) => write('settings', s)

export const loadPrompts = (): PromptSet => read('prompts', DEFAULT_PROMPTS)
export const savePrompts = (p: PromptSet) => write('prompts', p)
export const resetPrompts = () => write('prompts', DEFAULT_PROMPTS)

export function loadArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(NS + key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export const loadDocs = (): KnowledgeDoc[] => loadArray<KnowledgeDoc>('docs')
export const saveDocs = (d: KnowledgeDoc[]) => write('docs', d)

export const loadNotes = (): string => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(NS + 'notes') ?? ''
}
export const saveNotes = (n: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NS + 'notes', n)
  } catch {
    /* ignore */
  }
}

export const loadScript = (): string => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(NS + 'script') ?? ''
}
export const saveScript = (s: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NS + 'script', s)
  } catch {
    /* ignore */
  }
}

export const loadTopic = (mode: ModeId): string => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(NS + 'topic:' + mode) ?? ''
}
export const saveTopic = (mode: ModeId, topic: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NS + 'topic:' + mode, topic)
  } catch {
    /* ignore */
  }
}

/**
 * Take history persists across reloads, but the recorded media does not — object URLs
 * die with the page, and stashing video in localStorage would blow the quota instantly.
 */
export const loadTakes = (): Take[] => loadArray<Take>('takes')
export const saveTakes = (takes: Take[]) =>
  write(
    'takes',
    takes.slice(0, 50).map(({ mediaUrl: _mediaUrl, ...rest }) => rest),
  )
