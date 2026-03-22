import { NavLink } from 'react-router-dom'
import { Home, AlertTriangle, Building2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/',         label: 'Visão Geral', Icon: Home },
  { to: '/alerts',   label: 'Alertas',     Icon: AlertTriangle },
  { to: '/merchants', label: 'Comerciantes', Icon: Building2 },
  { to: '/reports',  label: 'Relatórios',  Icon: FileText },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 md:hidden">
      <div className="flex justify-around">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-400'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
