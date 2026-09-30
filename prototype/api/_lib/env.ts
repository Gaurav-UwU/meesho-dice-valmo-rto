import { z } from 'zod'

const EnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  OTP_PEPPER: z.string().min(32),
  ADMIN_TOKEN: z.string().min(12),
  LIVE_KEY: z.string().min(6),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(16),
  TWILIO_WHATSAPP_FROM: z.string().startsWith('whatsapp:+'),
  TWILIO_WEBHOOK_URL: z.url(),
})

export type ServerEnv = z.infer<typeof EnvSchema>

/**
 * Read and check the server's secrets at startup. On a problem it names the missing or malformed variables
 * (never their values) so a bad deploy fails loudly instead of half working.
 */
export function loadEnv(raw: Readonly<Record<string, string | undefined>>): ServerEnv {
  const r = EnvSchema.safeParse(raw)
  if (!r.success) {
    const names = [...new Set(r.error.issues.map((i) => String(i.path[0])))]
    throw new Error(`Server is not configured. Check these environment variables: ${names.join(', ')}`)
  }
  return r.data
}
