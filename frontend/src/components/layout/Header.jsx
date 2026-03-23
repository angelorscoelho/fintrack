import { useLocation } from 'react-router-dom'
import { ShieldAlert, Wifi, WifiOff, Clock, Sun, Moon, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BREADCRUMBS = {
  '/':              'Overview',
  '/alerts':        'Alerts',
  '/transactions':  'Transactions',
  '/reports':       'Reports',
}

export function Header({ isConnected, isIdle, isDark, onToggleDark }) {
  const { pathname } = useLocation()

  // Resolve breadcrumb label — merchant paths get a special label
  let crumb = BREADCRUMBS[pathname]
  if (!crumb && pathname.startsWith('/merchants/')) {
    crumb = 'Merchant Profile'
  }

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Left — brand */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-blue-600" />
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">FinTrack AI</span>
        </div>

        {/* Center — breadcrumb (desktop only) */}
        {crumb && (
          <span className="hidden md:block text-sm text-slate-500 dark:text-slate-400">{crumb}</span>
        )}

        {/* Right — status indicators + dark mode toggle */}
        <div className="flex items-center gap-3">
          {/* Language indicator (English only for now) */}
          <div className="flex items-center gap-1 text-xs text-slate-500 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EN</span>
          </div>

          {/* Dark mode toggle */}
          <Button variant="ghost" size="icon" onClick={onToggleDark} className="h-8 w-8" aria-label="Toggle dark mode">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* SSE connection */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
            )}
          </div>

          {/* Inactivity */}
          {isIdle && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded border border-amber-200 dark:border-amber-700">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Inactive</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
