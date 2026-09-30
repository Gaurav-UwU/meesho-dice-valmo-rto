import { createHmac } from 'node:crypto'
import { safeEqual } from './otp.ts'

export interface TwilioConfig {
  readonly accountSid: string
  readonly authToken: string
  /** e.g. whatsapp:+14155238886 (the Twilio sandbox number) */
  readonly from: string
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

/**
 * Twilio signs each webhook: base64(HMAC-SHA1(authToken, fullUrl + each POST param name and value, sorted by name)).
 * Reject anything that does not match, or anyone could post fake customer replies.
 */
export function twilioSignature(authToken: string, url: string, params: Readonly<Record<string, string>>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url)
  return createHmac('sha1', authToken).update(data).digest('base64')
}

export function verifyTwilioSignature(authToken: string, url: string, params: Readonly<Record<string, string>>, signature: string | null): boolean {
  if (!signature) return false
  return safeEqual(twilioSignature(authToken, url, params), signature)
}

export const toWhatsApp = (phone: string): string => `whatsapp:${phone}`
export const fromWhatsApp = (addr: string): string => addr.replace(/^whatsapp:/, '')

/** Send one WhatsApp message through Twilio's REST API. Throws with a short reason if Twilio refuses. */
export async function sendWhatsApp(cfg: TwilioConfig, toPhone: string, body: string, doFetch: FetchLike): Promise<void> {
  const res = await doFetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: cfg.from, To: toWhatsApp(toPhone), Body: body }).toString(),
  })
  if (!res.ok) throw new Error(`Twilio refused the message (HTTP ${res.status})`)
}
