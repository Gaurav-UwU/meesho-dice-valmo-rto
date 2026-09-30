import { loadEnv } from '../api/_lib/env.ts'

/** Says whether the server is configured, naming any missing variables (never their values). */
export function GET(): Response {
  try {
    loadEnv(process.env)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : 'not configured' }, { status: 503 })
  }
}
