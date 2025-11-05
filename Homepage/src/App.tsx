import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import WhyChoose from './components/WhyChoose';
import CTA from './components/CTA';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Hero />
      <Features />
      <HowItWorks />
      <WhyChoose />
      <CTA />
    </div>
  );
}

export default App;
