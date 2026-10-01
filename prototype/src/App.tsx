import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Audit from './pages/Audit.tsx'
import Captain from './pages/Captain.tsx'
import Customer from './pages/Customer.tsx'
import Desk from './pages/Desk.tsx'
import Landing from './pages/Landing.tsx'
import Live from './pages/Live.tsx'
import Ops from './pages/Ops.tsx'
import Pilot from './pages/Pilot.tsx'
import Rider from './pages/Rider.tsx'
import { ByDay } from './ui/ByDay.tsx'
import { SyncNotices } from './ui/SyncNotices.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <SyncNotices />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ops" element={<ByDay><Ops /></ByDay>} />
        <Route path="/rider" element={<ByDay><Rider /></ByDay>} />
        <Route path="/customer" element={<ByDay><Customer /></ByDay>} />
        <Route path="/captain" element={<ByDay><Captain /></ByDay>} />
        <Route path="/desk" element={<ByDay><Desk /></ByDay>} />
        <Route path="/pilot" element={<Pilot />} />
        <Route path="/audit" element={<ByDay><Audit /></ByDay>} />
        <Route path="/live" element={<ByDay><Live /></ByDay>} />
      </Routes>
    </BrowserRouter>
  )
}
