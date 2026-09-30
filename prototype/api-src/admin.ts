import { createRateLimiter, handleAdmin } from '../api/_lib/http.ts'
import { runtime } from '../api/_lib/runtime.ts'

const allow = createRateLimiter(10, 60_000)

/** Reset the day, run autopilot, or link a real phone to an order. Needs the admin token. */
export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) return Response.json({ ok: false, error: 'Slow down a little' }, { status: 429 })
  try {
    const { env, deps } = runtime()
    return await handleAdmin(request, deps, { adminToken: env.ADMIN_TOKEN })
  } catch (e) {
    console.error('admin failed', e instanceof Error ? e.message : 'unknown')
    return Response.json({ ok: false, error: 'Something went wrong on the server' }, { status: 500 })
  }
}
