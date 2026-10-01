import { createRateLimiter, handleEnsure } from '../api/_lib/http.ts'
import { runtime } from '../api/_lib/runtime.ts'

const allow = createRateLimiter(60, 60_000)

/** Create the hub's day if it is missing (never touches an existing one). Rate limited: a wrong key is the only thing that can be guessed here. */
export async function GET(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) return Response.json({ ok: false, error: 'Slow down a little' }, { status: 429 })
  try {
    const { env, deps } = runtime()
    return await handleEnsure(request, deps, { liveKey: env.LIVE_KEY, captainKey: env.CAPTAIN_KEY })
  } catch (e) {
    console.error('ensure failed', e instanceof Error ? e.message : 'unknown')
    return Response.json({ ok: false, error: 'Something went wrong on the server' }, { status: 500 })
  }
}
