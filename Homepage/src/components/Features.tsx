import { BarChart3, Zap, Calendar, RefreshCw, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Intelligent Predictions',
    description: 'Conservative, baseline, and aggressive prediction modes that account for form, fixtures, team strength, and momentum',
    highlights: ['Form analysis', 'Fixture difficulty', 'Team strength', 'Position-specific caps']
  },
  {
    icon: Zap,
    title: 'Smart Optimisation',
    description: 'Auto-select your best XI for any gameweek and discover market leaders and differential picks',
    highlights: ['Best XI selection', 'Market leaders', 'Differential picks', 'Side-by-side comparison']
  },
  {
    icon: Calendar,
    title: 'Fixture Analysis',
    description: 'Multi-gameweek fixture difficulty visualisation with double gameweek planning and team strength differentials',
    highlights: ['Multi-GW planning', 'Fixture difficulty', 'Double gameweeks', 'Team differentials']
  },
  {
    icon: RefreshCw,
    title: 'Real-Time Sync',
    description: 'One-click FPL team import with latest player prices, ownership data, and live injury updates',
    highlights: ['One-click import', 'Live prices', 'Ownership data', 'Injury updates']
  }
];

export default function Features() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              Dominate FPL
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to give you the competitive edge
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group bg-white border border-slate-200 rounded-2xl p-8 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-xl shadow-lg"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">{feature.description}</p>

              <div className="grid grid-cols-2 gap-3">
                {feature.highlights.map((highlight, hIdx) => (
                  <div key={hIdx} className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button className="group px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white rounded-lg font-semibold text-lg shadow-lg shadow-fuchsia-500/50 transition-all duration-200 inline-flex items-center gap-2">
            Start Using FPL Companion
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
