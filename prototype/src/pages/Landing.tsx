import { Footer } from '../ui/Footer.tsx'
import { Hero } from './landing/Hero.tsx'
import { RealVsSim } from './landing/RealVsSim.tsx'
import { Setup } from './landing/Setup.tsx'
import { Walkthrough } from './landing/Walkthrough.tsx'
import './landing/landing.css'

/** One job: get a visitor through the demo. Everything else is a link or folded away. */
export default function Landing() {
  return (
    <div className="land-root">
      <Hero />
      <main className="land-main">
        <Setup />
        <Walkthrough />
        <RealVsSim />
      </main>
      <Footer />
    </div>
  )
}
