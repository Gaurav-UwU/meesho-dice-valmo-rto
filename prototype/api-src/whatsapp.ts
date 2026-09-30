import { createRateLimiter, handleTwilio } from '../api/_lib/http.ts'
import { runtime } from '../api/_lib/runtime.ts'

const allow = createRateLimiter(120, 60_000)

/** Twilio calls this when a customer replies on WhatsApp. Requests without a valid Twilio signature are refused. */
export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) return Response.json({ ok: false, error: 'Slow down a little' }, { status: 429 })
  try {
    const { env, deps } = runtime()
    return await handleTwilio(request, deps, { authToken: env.TWILIO_AUTH_TOKEN, webhookUrl: env.TWILIO_WEBHOOK_URL })
  } catch (e) {
    console.error('whatsapp webhook failed', e instanceof Error ? e.message : 'unknown')
    return Response.json({ ok: false, error: 'Something went wrong on the server' }, { status: 500 })
  }
}
