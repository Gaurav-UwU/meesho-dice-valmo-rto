import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

/** A fresh 4-digit OTP from the OS random source. */
export const newOtp = (): string => String(randomInt(1000, 10000))

export const isPlainOtp = (code: string): boolean => /^\d{4}$/.test(code)

/**
 * OTPs are stored as HMAC(pepper, orderId:code). A bare hash of a 4-digit code could be brute-forced in an instant by
 * anyone who can read the public state, so the server-side pepper is what keeps them safe.
 */
export function hashOtp(pepper: string, orderId: string, code: string): string {
  return createHmac('sha256', pepper).update(`${orderId}:${code}`).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
