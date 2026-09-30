import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Audit from './pages/Audit.tsx'
import Customer from './pages/Customer.tsx'
import Desk from './pages/Desk.tsx'
import Landing from './pages/Landing.tsx'
import Live from './pages/Live.tsx'
import Ops from './pages/Ops.tsx'
import Pilot from './pages/Pilot.tsx'
import Rider from './pages/Rider.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ops" element={<Ops />} />
        <Route path="/rider" element={<Rider />} />
        <Route path="/customer" element={<Customer />} />
        <Route path="/desk" element={<Desk />} />
        <Route path="/pilot" element={<Pilot />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/live" element={<Live />} />
      </Routes>
    </BrowserRouter>
  )
}
