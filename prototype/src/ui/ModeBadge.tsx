import { useStore } from '../store/StoreContext.tsx'

/** "Demo mode" (on-screen phone, this browser only) or "Live mode" (real WhatsApp, shared through Supabase). */
export function ModeBadge() {
  const { mode } = useStore()
  return (
    <span className="pill" style={mode === 'live' ? { background: '#e7f6ee', color: '#0e8a4f', fontWeight: 700 } : { background: '#ecebf5', color: '#092d5e' }}>
      {mode === 'live' ? '● Live mode' : 'Demo mode'}
    </span>
  )
}
