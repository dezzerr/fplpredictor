'use client'

import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'

export default function LandingCTA() {
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
              <Link href="/" className="group inline-flex px-8 py-4 bg-white hover:bg-slate-100 text-fuchsia-600 rounded-lg font-semibold text-lg shadow-xl transition-all duration-200 items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/" className="inline-flex px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-lg border-2 border-white/30 backdrop-blur-sm transition-colors duration-200">
                View Demo
              </Link>
            </div>

            <p className="text-white/70 text-sm mt-6">
              No credit card required • Free forever • Setup in 60 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white transform rotate-[-45deg]" />
            </div>
            <span className="text-xl font-bold text-slate-900">FPL Companion</span>
          </div>
          <p className="text-slate-600 text-sm">
            © 2025 FPL Companion. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-500">
            <Link href="/login" className="hover:text-fuchsia-600 transition-colors">Sign In</Link>
            <span>•</span>
            <Link href="/" className="hover:text-fuchsia-600 transition-colors">Privacy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-fuchsia-600 transition-colors">Terms</Link>
          </div>
        </footer>
      </div>
    </section>
  )
}
