import LandingHero from '@/components/landing/LandingHero'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingWhyChoose from '@/components/landing/LandingWhyChoose'
import LandingCTA from '@/components/landing/LandingCTA'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingWhyChoose />
      <LandingCTA />
    </div>
  )
}
