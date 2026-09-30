import { Link } from 'react-router-dom'
import { useHubParam } from '../../ui/hub.ts'
import { HubPicker } from '../../ui/HubPicker.tsx'
import { SyncBadge } from '../../ui/SyncBadge.tsx'

export function OpsHeader() {
  const { hub } = useHubParam()
  return (
    <header className="ops-header">
      <h1 className="ops-title">Valmo ops console</h1>
      <SyncBadge hubId={hub.id} />
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
