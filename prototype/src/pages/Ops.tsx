import { useDay } from '../store/StoreContext.tsx'
import { DayLoading } from '../ui/DayLoading.tsx'
import { Footer } from '../ui/Footer.tsx'
import { useHubParam } from '../ui/hub.ts'
import './ops/ops.css'
import { OpsDashboard } from './ops/OpsDashboard.tsx'
import { OpsHeader } from './ops/OpsHeader.tsx'

/** Valmo ops console: the central team's view of the day. Rendered purely from the store, so it follows the rider and customer screens live. */
export default function Ops() {
  const { hub } = useHubParam()
  const state = useDay(hub.id)
  return (
    <div className="ops-page">
      <OpsHeader />
      {state ? (
        <OpsDashboard key={hub.id} state={state} />
      ) : (
        <DayLoading hubId={hub.id} className="ops-loading" />
      )}
      <Footer />
    </div>
  )
}
