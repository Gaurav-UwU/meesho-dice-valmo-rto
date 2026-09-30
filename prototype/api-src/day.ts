import { handleEnsure } from '../api/_lib/http.ts'
import { runtime } from '../api/_lib/runtime.ts'

/** Create the hub's day if it is missing (never touches an existing one). */
export async function GET(request: Request): Promise<Response> {
  try {
    const { env, deps } = runtime()
    return await handleEnsure(request, deps, { liveKey: env.LIVE_KEY })
  } catch (e) {
    console.error('ensure failed', e instanceof Error ? e.message : 'unknown')
    return Response.json({ ok: false, error: 'Something went wrong on the server' }, { status: 500 })
  }
}
