import { useState, type FormEvent } from 'react'
import { demoStops } from '../domain/selectors.ts'
import { useDay, useStore } from '../store/StoreContext.tsx'
import { Footer } from '../ui/Footer.tsx'
import { HubPicker } from '../ui/HubPicker.tsx'
import { persona } from '../ui/format.ts'
import { useHubParam } from '../ui/hub.ts'
import './live/live.css'

const TOKEN_KEY = 'rescue-admin-token'
const PHONE = /^\+\d{10,15}$/

interface Outcome {
  readonly ok: boolean
  readonly text: string
}

const readToken = (): string => {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

async function callAdmin(token: string, body: Record<string, unknown>): Promise<Outcome> {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { ok?: boolean; error?: string }
    return res.ok && json.ok ? { ok: true, text: 'Done.' } : { ok: false, text: json.error ?? `The server said no (${res.status})` }
  } catch {
    return { ok: false, text: 'Could not reach the server.' }
  }
}

/** Live-mode admin: check that WhatsApp reaches a phone, and link a real phone to one demo order. */
export default function Live() {
  const { mode } = useStore()
  const { hub } = useHubParam()
  const day = useDay(hub.id)
  const [token, setToken] = useState(readToken)
  const [pingPhone, setPingPhone] = useState('')
  const [bindPhone, setBindPhone] = useState('')
  const [orderId, setOrderId] = useState('')
  const [pingResult, setPingResult] = useState<Outcome | null>(null)
  const [bindResult, setBindResult] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)

  const saveToken = (value: string): void => {
    setToken(value)
    try {
      window.sessionStorage.setItem(TOKEN_KEY, value)
    } catch {
      // Not stored; the field still works for this page view.
    }
  }

  const demo = day ? demoStops(day) : { bonus: [], control: [] }
  const choices = [...demo.bonus.map((id) => ({ id, group: 'Rider A' })), ...demo.control.map((id) => ({ id, group: 'Rider B' }))]
  const chosen = orderId || choices[0]?.id || ''

  const run = async (body: Record<string, unknown>, done: (o: Outcome) => void): Promise<void> => {
    setBusy(true)
    done(await callAdmin(token, body))
    setBusy(false)
  }

  const onPing = (e: FormEvent): void => {
    e.preventDefault()
    void run({ op: 'ping', phone: pingPhone.trim() }, setPingResult)
  }

  const onBind = (e: FormEvent): void => {
    e.preventDefault()
    void run({ op: 'bind', hubId: hub.id, orderId: chosen, phone: bindPhone.trim() }, setBindResult)
  }

  return (
    <main className="live-page">
      <h1>Live mode: WhatsApp setup</h1>
      <p className="live-lead">Real WhatsApp on team phones. Each phone stands in for one synthetic customer. This page is for the team, not for judges.</p>
      {mode !== 'live' ? (
        <div className="live-warn">
          This page only works in Live mode. <a href={`/live?hub=${hub.id}&mode=live`}>Open it in Live mode</a>.
        </div>
      ) : null}

      <section className="live-card">
        <h2>Admin token</h2>
        <p>Kept for this browser tab only.</p>
        <label className="live-field">
          <span>ADMIN_TOKEN (from your .env.local)</span>
          <input type="password" value={token} autoComplete="off" onChange={(e) => saveToken(e.target.value)} />
        </label>
      </section>

      <section className="live-card">
        <h2>1. Test that WhatsApp reaches a phone</h2>
        <p>The phone must have joined the Twilio sandbox in the last 3 days. Include the country code, like +91.</p>
        <form className="live-row" onSubmit={onPing}>
          <label className="live-field">
            <span>Phone number</span>
            <input inputMode="tel" placeholder="+919876543210" value={pingPhone} onChange={(e) => setPingPhone(e.target.value)} />
          </label>
          <button type="submit" className="btn pink" disabled={busy || !token || !PHONE.test(pingPhone.trim())}>
            Send test message
          </button>
        </form>
        {pingResult ? <div className={`live-msg ${pingResult.ok ? 'ok' : 'bad'}`}>{pingResult.ok ? 'Sent. Check the phone.' : pingResult.text}</div> : null}
      </section>

      <section className="live-card">
        <h2>2. Link a phone to a demo order</h2>
        <p>
          From then on, the messages for that order (order-day message, OTP, checks) go to this real phone, and its numbered replies come back.
        </p>
        <p>
          <HubPicker />
        </p>
        <form className="live-row" onSubmit={onBind}>
          <label className="live-field">
            <span>Order</span>
            <select value={chosen} onChange={(e) => setOrderId(e.target.value)} disabled={choices.length === 0}>
              {choices.length === 0 ? <option>Start the day on the ops console first</option> : null}
              {choices.map(({ id, group }) => (
                <option key={id} value={id}>
                  {group}: {day ? persona(day.stops[id].order, hub.name).name : ''} · {id}
                </option>
              ))}
            </select>
          </label>
          <label className="live-field">
            <span>Phone number</span>
            <input inputMode="tel" placeholder="+919876543210" value={bindPhone} onChange={(e) => setBindPhone(e.target.value)} />
          </label>
          <button type="submit" className="btn pink" disabled={busy || !token || !chosen || !PHONE.test(bindPhone.trim())}>
            Link phone
          </button>
        </form>
        {bindResult ? (
          <div className={`live-msg ${bindResult.ok ? 'ok' : 'bad'}`}>
            {bindResult.ok ? 'Linked. Now tap Deliver on that order in the rider app: the OTP arrives on the phone.' : bindResult.text}
          </div>
        ) : null}
      </section>
      <Footer />
    </main>
  )
}
