import { useState, useEffect } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { Info, X } from 'lucide-react'

/**
 * Non-intrusive top banner displayed when the app is running with mock data
 * because the backend API is unreachable.
 */
const DISMISS_KEY = 'fintrack.demoBanner.dismissed'

export function DemoBanner({ isMockMode }) {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const persisted = sessionStorage.getItem(DISMISS_KEY) === '1'
    if (persisted) {
      setDismissed(true)
    }
  }, [])

  const onDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  if (!isMockMode || dismissed) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-800 dark:text-amber-300">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>{t('demo.banner')}</span>
      <button
        onClick={onDismiss}
        className="ml-2 shrink-0 rounded p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
        aria-label={t('actions.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
