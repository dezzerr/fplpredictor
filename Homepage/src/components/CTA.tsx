import { ArrowRight, Mail } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main CTA */}
        <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-3xl p-12 sm:p-16 mb-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

          <div className="relative text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Dominate Your Mini-League?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of FPL managers making smarter decisions with AI-powered predictions
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="group px-8 py-4 bg-white hover:bg-slate-100 text-fuchsia-600 rounded-lg font-semibold text-lg shadow-xl transition-all duration-200 flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-lg border-2 border-white/30 backdrop-blur-sm transition-colors duration-200">
                View Demo
              </button>
            </div>

            <p className="text-white/70 text-sm mt-6">
              No credit card required • Free forever • Setup in 60 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-white transform rotate-[-45deg]" />
                </div>
                <span className="text-2xl font-bold text-white">FPL Companion</span>
              </div>
              <p className="text-slate-400 max-w-md mb-4">
                AI-powered Fantasy Premier League predictions and squad optimisation. Make smarter decisions, climb your mini-league.
              </p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <a href="mailto:hello@fplcompanion.com" className="text-slate-400 hover:text-fuchsia-400 transition-colors">
                  hello@fplcompanion.com
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-slate-400 hover:text-fuchsia-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-slate-400 hover:text-fuchsia-400 transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="text-slate-400 hover:text-fuchsia-400 transition-colors">Pricing</a></li>
                <li><a href="#faq" className="text-slate-400 hover:text-fuchsia-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#privacy" className="text-slate-400 hover:text-fuchsia-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="text-slate-400 hover:text-fuchsia-400 transition-colors">Terms of Service</a></li>
                <li><a href="#contact" className="text-slate-400 hover:text-fuchsia-400 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2024 FPL Companion. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Not affiliated with the Premier League or Fantasy Premier League
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
