import { Link } from 'react-router-dom'

const MENU = [
  'Dashboard',
  'Tracking',
  'Inbound',
  'Manifest Unload',
  'RVP Inscan',
  'DRS',
  'Forward Manifest',
  'Refused Parcel Desk',
  'RTO Manifest',
  'COD',
  'Hub captain',
  'Audit',
] as const

const ACTIVE = 'Refused Parcel Desk'

interface DeskDrawerProps {
  readonly hubName: string
  readonly hubId: string
  readonly isOpen: boolean
  readonly onClose: () => void
}

/** The real Valmo Operations drawer. Only the highlighted item is ours; the rest are placeholders. */
export function DeskDrawer({ hubName, hubId, isOpen, onClose }: DeskDrawerProps) {
  return (
    <>
      {isOpen ? <div className="desk-scrim" onClick={onClose} aria-hidden="true" /> : null}
      <nav className={isOpen ? 'desk-drawer is-open' : 'desk-drawer'} aria-label="Valmo Operations menu">
        <div className="desk-drawer-head">
          <strong>Hub operator</strong>
          <span>{hubName}</span>
        </div>
        <ul>
          {MENU.map((item) => {
            const active = item === ACTIVE
            return (
              <li key={item}>
                {item === 'Hub captain' ? (
                  <Link className="desk-menu-item" to={`/captain?hub=${hubId}`} onClick={onClose}>
                    <span className="desk-menu-icon" aria-hidden="true" />
                    Hub captain
                    <span className="desk-new">NEW</span>
                  </Link>
                ) : item === 'Audit' ? (
                  <Link className="desk-menu-item" to={`/audit?hub=${hubId}`} onClick={onClose}>
                    <span className="desk-menu-icon" aria-hidden="true" />
                    Audit
                    <span className="desk-new">LIVE</span>
                  </Link>
                ) : (
                <button
                  type="button"
                  className={active ? 'desk-menu-item is-active' : 'desk-menu-item'}
                  aria-current={active ? 'page' : undefined}
                  onClick={onClose}
                >
                  <span className="desk-menu-icon" aria-hidden="true" />
                  {item}
                  {active ? <span className="desk-new">NEW</span> : null}
                </button>
                )}
              </li>
            )
          })}
        </ul>
        <div className="desk-drawer-foot">Demo build · synthetic data</div>
      </nav>
    </>
  )
}
