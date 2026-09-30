import { Link } from 'react-router-dom'
import { DEFAULT_HUB } from '../../ui/hub.ts'
import { MOVES } from './content.ts'

const FLOW = [
  { label: 'A risky order is flagged', note: 'top 20% by Rescue Score' },
  { label: 'The rider delivers it', note: 'confirmed with an OTP' },
  { label: '₹15 is held, then released', note: 'unless the order comes back' },
  { label: 'The pilot decides', note: 'GO, RE-PRICE or KILL' },
] as const

export function Hero() {
  return (
    <header className="land-hero">
      <div className="land-bar">
        <span className="land-brand">
          <span className="land-brand-mark" aria-hidden="true" />
          Valmo Rescue Console
        </span>
        <nav aria-label="Other pages">
          <Link to="/pilot">Pilot simulator</Link>
          <Link to={`/audit?hub=${DEFAULT_HUB}`}>Audit</Link>
        </nav>
      </div>
      <div className="land-hero-grid">
        <div className="land-hero-copy">
          <p className="land-eyebrow">Team GPS · IIT Bombay · Meesho DICE 3.0</p>
          <h1>
            Try the Rescue Console <span>in about six minutes</span>
          </h1>
          <p className="land-pitch">
            Pay a rider ₹15 only when a risky order actually gets delivered, and find out whether that is worth it. This page walks you through it, one tap at a time.
          </p>
          <div className="land-cta">
            <a className="land-btn land-btn--primary" href="#setup">
              Begin the walkthrough
            </a>
            <Link className="land-btn land-btn--plain" to="/pilot">
              Skip to the decision tool
            </Link>
          </div>
          <ul className="land-chips" aria-label="Good to know">
            <li>About 6 minutes</li>
            <li>No sign-in</li>
            <li>Synthetic data, not an official Valmo app</li>
          </ul>
        </div>
        <ol className="land-flow" aria-label="What you will see">
          {FLOW.map((f, i) => (
            <li key={f.label}>
              <span className="land-flow-dot" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{f.label}</strong>
                <small>{f.note}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <ul className="land-moves" aria-label="The three moves">
        {MOVES.map((m) => (
          <li key={m.title}>
            <span className="land-move-tag">{m.tag}</span>
            <strong>{m.title}</strong>
            <span>{m.text}</span>
          </li>
        ))}
      </ul>
    </header>
  )
}
