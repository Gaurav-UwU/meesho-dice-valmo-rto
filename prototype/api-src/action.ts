import { createRateLimiter, handleAction } from '../api/_lib/http.ts'
import { runtime } from '../api/_lib/runtime.ts'

const allow = createRateLimiter(90, 60_000)

/** A screen tapping a button in Live mode. */
export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) return Response.json({ ok: false, error: 'Slow down a little' }, { status: 429 })
  try {
    const { env, deps } = runtime()
    return await handleAction(request, deps, { liveKey: env.LIVE_KEY, captainKey: env.CAPTAIN_KEY })
  } catch (e) {
    console.error('action failed', e instanceof Error ? e.message : 'unknown')
    return Response.json({ ok: false, error: 'Something went wrong on the server' }, { status: 500 })
  }
}
