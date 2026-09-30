import { hashSeed } from '../engine/rng.ts'
import type { Order } from '../engine/types.ts'

export const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`

export const signedRupees = (n: number): string => `${n < 0 ? '−' : '+'}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`

export const pct = (x: number, digits = 1): string => `${(x * 100).toFixed(digits)}%`

export const clock = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Sneha', 'Imran', 'Pooja', 'Vikram', 'Neha', 'Arjun', 'Kavya', 'Sanjay', 'Meera', 'Farhan', 'Anjali', 'Rahul', 'Priya', 'Deepak', 'Sunita', 'Manoj', 'Ritu', 'Suresh', 'Nisha', 'Amit', 'Komal']
const INITIAL = 'ABCDGHJKMNPRSTV'
const LANDMARK = ['Near the temple', 'Opp. petrol pump', 'Behind the school', 'Near the water tank', 'Above the medical store', 'Next to the bus stop', 'Near the community hall']

export interface Persona {
  readonly name: string
  readonly address: string
  readonly landmark: string
}

/** Made-up but stable name and address for a synthetic order. No real people. */
export function persona(order: Order, hubName: string): Persona {
  const h = hashSeed(order.id)
  const name = `${FIRST[h % FIRST.length]} ${INITIAL[(h >>> 5) % INITIAL.length]}.`
  const house = 1 + ((h >>> 9) % 240)
  const area = order.pincode.startsWith('area-') ? `Area ${order.pincode.slice(5)}` : `PIN ${order.pincode}`
  return { name, address: `House ${house}, ${area}, ${hubName.split('·').pop()?.trim() ?? hubName}`, landmark: LANDMARK[(h >>> 14) % LANDMARK.length] }
}
