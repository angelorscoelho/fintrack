import { useLocation } from 'react-router-dom'
import { ShieldAlert, Wifi, WifiOff, Clock } from 'lucide-react'

const BREADCRUMBS = {
  '/':        'Visão Geral',
  '/alerts':  'Alertas',
  '/reports': 'Relatórios',
}

export function Header({ isConnected, isIdle }) {
  const { pathname } = useLocation()

  // Resolve breadcrumb label — merchant paths get a special label
  let crumb = BREADCRUMBS[pathname]
  if (!crumb && pathname.startsWith('/merchants/')) {
    crumb = 'Perfil Comerciante'
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Left — brand */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-blue-600" />
          <span className="text-base font-bold text-slate-900">FinTrack AI</span>
        </div>

        {/* Center — breadcrumb (desktop only) */}
        {crumb && (
          <span className="hidden md:block text-sm text-slate-500">{crumb}</span>
        )}

        {/* Right — status indicators */}
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Inativo</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
