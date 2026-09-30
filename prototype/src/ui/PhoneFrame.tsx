import type { ReactNode } from 'react'
import './phone-frame.css'

/**
 * On a laptop the app is shown inside a phone-shaped frame; on a real phone (narrow screen) it fills the screen.
 * The same page works for the demo on a laptop and for a rider or customer opening the QR link on their phone.
 */
export function PhoneFrame({ children, label }: { readonly children: ReactNode; readonly label?: string }) {
  return (
    <div className="phone-stage">
      {label ? <div className="phone-label">{label}</div> : null}
      <div className="phone-frame">
        <div className="phone-screen">{children}</div>
      </div>
    </div>
  )
}
