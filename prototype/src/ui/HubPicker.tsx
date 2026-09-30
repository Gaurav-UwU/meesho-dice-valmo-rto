import { HUBS } from '../engine/hubs.ts'
import { useHubParam } from './hub.ts'

export function HubPicker({ light = false }: { readonly light?: boolean }) {
  const { hub, setHub } = useHubParam()
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: light ? '#fff' : 'inherit' }}>
      <span>Hub</span>
      <select
        value={hub.id}
        onChange={(e) => setHub(HUBS.find((h) => h.id === e.target.value)?.id ?? hub.id)}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #c9cedd', font: 'inherit' }}
      >
        {HUBS.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} ({h.state})
          </option>
        ))}
      </select>
    </label>
  )
}
