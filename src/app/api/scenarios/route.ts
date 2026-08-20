import { NextResponse } from 'next/server'
import { loadScenarios } from '@/lib/scenarios'

export const runtime = 'nodejs'
/**
 * Read from disk on every request rather than at build time: the point of running the
 * prep agents locally is that a new scenario folder shows up on the next reload without
 * restarting anything.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { packs, skipped } = await loadScenarios()
  return NextResponse.json({ packs, skipped })
}
