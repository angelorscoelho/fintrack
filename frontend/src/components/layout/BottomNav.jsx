import { NavLink } from 'react-router-dom'
import { Home, AlertTriangle, Building2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

const TABS = [
  { to: '/',          labelKey: 'nav.overview',  Icon: Home },
  { to: '/alerts',    labelKey: 'nav.alerts',    Icon: AlertTriangle },
  { to: '/merchants', labelKey: 'nav.merchants', Icon: Building2 },
  { to: '/reports',   labelKey: 'nav.reports',   Icon: FileText },
]

export function BottomNav() {
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 md:hidden">
      <div className="flex justify-around">
        {TABS.map(({ to, labelKey, Icon }) => (
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
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
