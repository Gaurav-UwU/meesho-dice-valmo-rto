import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  readonly children: ReactNode
}

interface State {
  readonly failed: boolean
}

/**
 * If a screen ever crashes (for example on stale saved data), show a way out instead of a white page.
 * "Reset demo data" clears this browser's saved demo state and reloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Nothing to send anywhere: this is a local demo. The message on screen is the recovery path.
  }

  private reset = (): void => {
    try {
      for (const key of Object.keys(window.localStorage)) if (key.startsWith('rescue-console-')) window.localStorage.removeItem(key)
      window.sessionStorage.clear()
    } catch {
      // Storage may be blocked; reloading still helps.
    }
    window.location.assign('/')
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <main style={{ maxWidth: 520, margin: '15vh auto', padding: 24, fontFamily: 'var(--font-app)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22 }}>Something went wrong on this screen</h1>
        <p style={{ color: 'var(--valmo-muted)' }}>The saved demo data in this browser may be out of date. Resetting it takes you back to the start; nothing else is affected.</p>
        <button type="button" className="btn primary" onClick={this.reset}>
          Reset demo data
        </button>
      </main>
    )
  }
}
