'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function HomeCTA() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main CTA */}
        <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-900/50 to-indigo-900/50 rounded-[2.5rem] border border-slate-800 p-12 sm:p-20 mb-24 text-center">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full bg-fuchsia-500/20 blur-[128px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to Dominate Your Mini-League?
            </h2>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Join thousands of FPL managers making smarter decisions with AI-powered predictions
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl font-semibold text-lg border border-slate-700 backdrop-blur-sm transition-colors duration-200">
                View Demo
              </Link>
            </div>

            <p className="text-slate-500 text-sm mt-8">
              No credit card required • Free forever • Setup in 60 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8 border-t border-slate-800 pt-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <ArrowRight className="w-5 h-5 text-white transform rotate-[-45deg]" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">FPL Companion</span>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            © 2025 FPL Companion. All rights reserved. Not affiliated with the Premier League.
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </footer>
      </div>
    </section>
  )
}
