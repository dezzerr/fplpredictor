import Link from 'next/link'
import { Download } from 'lucide-react'

export function FPLConnectionStatus() {
  return (
    <Link
      href="/import"
      className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg hover:bg-violet-500/20 transition-colors"
    >
      <Download className="w-4 h-4 text-violet-400" />
      <span className="text-sm text-violet-300 font-medium">Import FPL Team</span>
    </Link>
  )
}
