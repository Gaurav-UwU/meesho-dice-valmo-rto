import type { ReactNode } from 'react'
import type { HubId } from '../engine/types.ts'
import './phone-frame.css'
import { SyncBadge } from './SyncBadge.tsx'

/**
 * On a laptop the app is shown inside a phone-shaped frame; on a real phone (narrow screen) it fills the screen.
 * The same page works for the demo on a laptop and for a rider or customer opening the QR link on their phone.
 */
export function PhoneFrame({ children, label, hubId }: { readonly children: ReactNode; readonly label?: string; readonly hubId?: HubId }) {
  return (
    <div className="phone-stage">
      {label ? <div className="phone-label">{label}</div> : null}
      <div className="phone-frame">
        <div className="phone-screen">
          {hubId ? <SyncBadge hubId={hubId} compact /> : null}
          {children}
        </div>
      </div>
    </div>
  )
}
