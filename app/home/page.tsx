import HomeHero from '@/components/home/HomeHero'
import HomeFeatures from '@/components/home/HomeFeatures'
import HomeHowItWorks from '@/components/home/HomeHowItWorks'
import HomeWhyChoose from '@/components/home/HomeWhyChoose'
import HomeCTA from '@/components/home/HomeCTA'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <HomeHero />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomeWhyChoose />
      <HomeCTA />
    </div>
  )
}
