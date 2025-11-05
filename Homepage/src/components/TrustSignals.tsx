import { Shield, RefreshCw, Target, Lock } from 'lucide-react';

const signals = [
  {
    icon: RefreshCw,
    title: 'Official FPL API',
    description: 'Powered by official Fantasy Premier League data plus betting odds for enhanced accuracy'
  },
  {
    icon: Target,
    title: '95% Accuracy',
    description: 'Predicted points within 5% of actual scores on average across all gameweeks'
  },
  {
    icon: RefreshCw,
    title: 'Real-Time Updates',
    description: 'Data refreshed every 15 minutes to ensure you have the latest information'
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'Your data stays private—we never store passwords or share personal information'
  }
];

export default function TrustSignals() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-cyan-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-300 text-sm mb-6">
            <Shield className="w-4 h-4" />
            <span>Trusted by Thousands of FPL Managers</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Built on{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              Trust & Accuracy
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {signals.map((signal, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-xl shadow-lg"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <signal.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{signal.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{signal.description}</p>
            </div>
          ))}
        </div>

        {/* Additional trust indicators */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 mb-2">10k+</div>
            <div className="text-slate-600 text-sm">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 mb-2">2M+</div>
            <div className="text-slate-600 text-sm">Predictions Made</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 mb-2">99.9%</div>
            <div className="text-slate-600 text-sm">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 mb-2">24/7</div>
            <div className="text-slate-600 text-sm">Available</div>
          </div>
        </div>
      </div>
    </section>
  );
}
