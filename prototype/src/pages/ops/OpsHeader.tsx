import { Link } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.tsx'
import { useHubParam } from '../../ui/hub.ts'
import { HubPicker } from '../../ui/HubPicker.tsx'

export function OpsHeader() {
  const store = useStore()
  const { hub } = useHubParam()
  return (
    <header className="ops-header">
      <h1 className="ops-title">Valmo ops console</h1>
      <span className="ops-badge">{store.mode === 'demo' ? 'Demo mode' : 'Live mode'}</span>
      <div className="ops-header-spacer" />
      <nav className="ops-nav" aria-label="Other screens">
        <Link to="/">Home</Link>
        <Link to={`/desk?hub=${hub.id}`}>Refused Parcel Desk</Link>
        <Link to="/pilot">Pilot</Link>
        <Link to={`/audit?hub=${hub.id}`}>Audit</Link>
      </nav>
      <HubPicker light />
    </header>
  )
}
