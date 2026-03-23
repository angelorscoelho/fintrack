import { useState, useEffect } from 'react'
import { isDemoMode } from '@/lib/api'
import { Info, X } from 'lucide-react'

/**
 * Non-intrusive top banner displayed when the app is running with mock data
 * because the backend API is unreachable.
 */
export function DemoBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(isDemoMode())
    }, 2000)
    return () => clearInterval(id)
  }, [])

  if (!visible || dismissed) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-800 dark:text-amber-300">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>Demo mode — using sample data because the API is not accessible.</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 shrink-0 rounded p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
