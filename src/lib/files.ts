/**
 * Knowledge base import. Plain text formats are read directly; PDFs go through
 * pdf.js, which is loaded on demand so it never lands in the initial bundle.
 */

import type { KnowledgeDoc } from './types'

/** Per-file cap. Enough for a resume, a spec, or a deck's notes; short of a novel. */
export const MAX_DOC_CHARS = 60_000
/** Cap on everything sent as {{knowledge}} in one request. */
export const MAX_KNOWLEDGE_CHARS = 120_000

const TEXT_EXT = ['.txt', '.md', '.markdown', '.json', '.csv', '.yaml', '.yml', '.tex', '.html', '.rtf']

export function isSupported(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return true
  if (TEXT_EXT.some((e) => name.endsWith(e))) return true
  return file.type.startsWith('text/')
}

async function extractPdf(file: File): Promise<string> {
  // pdf.js ships its worker separately; `disableWorker` keeps this to a single import
  // at the cost of blocking the main thread briefly on large files.
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = ''
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf, useWorkerFetch: false, isEvalSupported: false }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(
      content.items
        .map((it) => ('str' in it ? (it as { str: string }).str : ''))
        .join(' ')
        .replace(/\s+/g, ' '),
    )
  }
  return parts.join('\n\n')
}

export async function extractText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    try {
      return await extractPdf(file)
    } catch {
      throw new Error(
        `Could not read ${file.name}. If pdf.js is not installed, copy the text out and paste it into Notes instead.`,
      )
    }
  }
  return file.text()
}

export async function importFile(file: File): Promise<KnowledgeDoc> {
  if (!isSupported(file)) {
    throw new Error(`${file.name}: unsupported type. Use .txt, .md, .csv, .json, or .pdf — or paste into Notes.`)
  }
  const raw = (await extractText(file)).trim()
  if (!raw) throw new Error(`${file.name} came back empty. If it is a scanned PDF there is no text layer to read.`)
  const text = raw.length > MAX_DOC_CHARS ? raw.slice(0, MAX_DOC_CHARS) + '\n\n[truncated]' : raw
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    text,
    chars: text.length,
    addedAt: Date.now(),
  }
}

/** Notes + every doc, flattened into the single {{knowledge}} string. */
export function buildKnowledge(notes: string, docs: KnowledgeDoc[]): string {
  const blocks: string[] = []
  if (notes.trim()) blocks.push(`--- Notes ---\n${notes.trim()}`)
  for (const d of docs) blocks.push(`--- ${d.name} ---\n${d.text}`)
  const joined = blocks.join('\n\n')
  return joined.length > MAX_KNOWLEDGE_CHARS
    ? joined.slice(0, MAX_KNOWLEDGE_CHARS) + '\n\n[knowledge base truncated to fit the request]'
    : joined
}
