import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { ANALYSIS_SCHEMA, QUESTIONS_SCHEMA } from '@/lib/schemas'
import type { CoachRequest } from '@/lib/types'

export const runtime = 'nodejs'
/** Analysis at high effort can take a while; Vercel caps Hobby at 60s regardless. */
export const maxDuration = 120

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'

/**
 * Key resolution, in order:
 *   1. `x-anthropic-key` header — the visitor's own key, held in their browser's
 *      localStorage and sent per request. Never persisted server-side.
 *   2. `ANTHROPIC_API_KEY` env var — your key, so a deployed instance works for
 *      anyone you share it with.
 *   3. Neither: 428, and the client falls back to local heuristic scoring.
 */
function resolveKey(req: Request): { key: string; source: 'user' | 'server' } | null {
  const userKey = req.headers.get('x-anthropic-key')?.trim()
  if (userKey) return { key: userKey, source: 'user' }
  const serverKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (serverKey) return { key: serverKey, source: 'server' }
  return null
}

export async function GET() {
  // Lets the client show "using the server key" vs "paste your key" without a round trip.
  return NextResponse.json({
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    model: DEFAULT_MODEL,
  })
}

export async function POST(req: Request) {
  let body: CoachRequest
  try {
    body = (await req.json()) as CoachRequest
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  if (body.action !== 'questions' && body.action !== 'analyze') {
    return NextResponse.json({ error: `Unknown action "${body.action}".` }, { status: 400 })
  }
  if (!body.systemPrompt?.trim() || !body.userPrompt?.trim()) {
    return NextResponse.json({ error: 'Both prompts are required.' }, { status: 400 })
  }

  const resolved = resolveKey(req)
  if (!resolved) {
    return NextResponse.json(
      {
        error: 'no_key',
        message:
          'No Anthropic key available. Add one in Settings, or set ANTHROPIC_API_KEY on the deployment.',
      },
      { status: 428 },
    )
  }

  const client = new Anthropic({ apiKey: resolved.key })
  const model = body.model?.trim() || DEFAULT_MODEL
  const schema = body.action === 'questions' ? QUESTIONS_SCHEMA : ANALYSIS_SCHEMA

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: body.effort ?? 'high',
        format: { type: 'json_schema', schema },
      },
      system: body.systemPrompt,
      messages: [{ role: 'user', content: body.userPrompt }],
    })

    // Safety classifiers can decline with a 200 and an empty/partial content array,
    // so this has to be checked before touching `content`.
    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        {
          error: 'refusal',
          message:
            'Claude declined this request. That is usually the topic or knowledge base tripping a safety filter — try rewording, or trim the knowledge base.',
          category: response.stop_details?.type === 'refusal' ? response.stop_details.category : null,
        },
        { status: 422 },
      )
    }

    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'truncated', message: 'The response was cut off. Try a shorter knowledge base or a lower effort setting.' },
        { status: 502 },
      )
    }

    const text = response.content.find((b) => b.type === 'text')?.text
    if (!text) {
      return NextResponse.json({ error: 'empty', message: 'Claude returned no text.' }, { status: 502 })
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'unparseable', message: 'Claude returned text that was not valid JSON.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      data,
      model: response.model,
      keySource: resolved.source,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    })
  } catch (err: unknown) {
    // Typed SDK errors, most specific first — the distinction matters to the user:
    // a bad key is their problem to fix, a 429 or 5xx is worth retrying.
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'auth', message: 'That API key was rejected. Check it in Settings — keys start with "sk-ant-".' },
        { status: 401 },
      )
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json(
        { error: 'permission', message: `That key cannot use ${model}. Try a model your account has access to.` },
        { status: 403 },
      )
    }
    if (err instanceof Anthropic.NotFoundError) {
      return NextResponse.json(
        { error: 'model', message: `Model "${model}" was not found. Check the model name in Settings.` },
        { status: 404 },
      )
    }
    if (err instanceof Anthropic.RateLimitError) {
      const retryAfter = err.headers?.get?.('retry-after') ?? '30'
      return NextResponse.json(
        { error: 'rate_limit', message: `Rate limited. Try again in about ${retryAfter}s.` },
        { status: 429 },
      )
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: 'network', message: 'Could not reach the Anthropic API. Check your connection.' },
        { status: 503 },
      )
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: 'api', message: err.message || 'The Anthropic API returned an error.' },
        { status: err.status && err.status >= 400 ? err.status : 502 },
      )
    }
    return NextResponse.json(
      { error: 'unknown', message: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 },
    )
  }
}
