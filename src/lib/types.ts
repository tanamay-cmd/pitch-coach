export type ModeId = 'interview' | 'impromptu' | 'pitch' | 'script'

export interface Question {
  level: number
  text: string
  /** Why this question is being asked — shown under the question, helps you aim the answer. */
  probing?: string
}

export interface KnowledgeDoc {
  id: string
  name: string
  /** Extracted plain text. Truncated at import time to keep requests sane. */
  text: string
  chars: number
  addedAt: number
}

/** Locally computed, no API key needed. Always present on a take. */
export interface Metrics {
  durationSec: number
  words: number
  wordsPerMinute: number
  fillerCount: number
  fillersFound: { word: string; count: number }[]
  echoedQuestion: boolean
  /** Rough Answer -> Story -> So-what structure detection. */
  openedWithAnswer: boolean
  hasConcreteExample: boolean
  endedWithPoint: boolean
  longestMonologueRun: number
  /** Script mode only: share of script key phrases that showed up in the transcript. */
  scriptCoverage?: number
  missedScriptPoints?: string[]
}

export interface Dimension {
  name: string
  score: number
  comment: string
}

/** Shape returned by /api/coach action=analyze. Mirrors ANALYSIS_SCHEMA in schemas.ts. */
export interface Analysis {
  overallScore: number
  headline: string
  dimensions: Dimension[]
  strengths: string[]
  fixes: { issue: string; quote?: string; instead: string }[]
  modelAnswer: string
  followUpQuestion: string
  /** Set by the client, not the model. */
  source: 'claude' | 'local'
  model?: string
}

export interface Take {
  id: string
  createdAt: number
  mode: ModeId
  topic: string
  question: string
  transcript: string
  metrics: Metrics
  analysis?: Analysis
  /** Object URL for the recorded blob. Lives only for the current page session. */
  mediaUrl?: string
  mediaType?: string
}

export interface Settings {
  apiKey: string
  model: string
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  targetSeconds: number
  greenZoneSeconds: number
  recognitionLang: string
  mirror: boolean
  recordVideo: boolean
}

export interface CoachRequest {
  action: 'questions' | 'analyze'
  mode: ModeId
  topic: string
  knowledge: string
  question?: string
  transcript?: string
  metrics?: Metrics
  script?: string
  level?: number
  count?: number
  targetSeconds?: number
  systemPrompt: string
  userPrompt: string
  model?: string
  effort?: Settings['effort']
}

export interface KeyStatus {
  serverKey: boolean
  model: string
}
