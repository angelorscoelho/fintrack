import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, Wifi, WifiOff, Clock, Sun, Moon, Languages, Check } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useLanguage } from '@/i18n/LanguageContext'

const BREADCRUMB_KEYS = {
  '/':              'header.breadcrumbs./',
  '/alerts':        'header.breadcrumbs./alerts',
  '/transactions':  'header.breadcrumbs./transactions',
  '/reports':       'header.breadcrumbs./reports',
  '/budget':        'header.breadcrumbs./budget',
}

const LANG_OPTIONS = [
  { code: 'en', flag: '🇬🇧', label: 'English (EN)' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch (DE)' },
  { code: 'pt', flag: '🇵🇹', label: 'Português (PT)' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands (NL)' },
  { code: 'es', flag: '🇪🇸', label: 'Español (ES)' },
]

export function Header({ isConnected, isIdle, isDark, onToggleDark }) {
  const { pathname } = useLocation()
  const { lang, setLang, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  // Resolve breadcrumb label
  let crumbKey = BREADCRUMB_KEYS[pathname]
  if (!crumbKey && pathname.startsWith('/merchants/')) {
    crumbKey = 'header.breadcrumbs.merchantProfile'
  }
  const crumb = crumbKey ? t(crumbKey) : null

  // Close dropdown on click-away
  useEffect(() => {
    if (!langOpen) return
    function handleClick(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [langOpen])

  // Close dropdown on ESC
  useEffect(() => {
    if (!langOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [langOpen])

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Left — brand */}
        <Link to="/" className="flex items-center gap-2 no-underline cursor-pointer">
          <ShieldAlert className="h-5 w-5 text-blue-600" />
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{t('header.brand')}</span>
        </Link>

        {/* Center — breadcrumb (desktop only) */}
        {crumb && (
          <span className="hidden md:block text-sm text-slate-500 dark:text-slate-400">{crumb}</span>
        )}

        {/* Right — status indicators + dark mode toggle */}
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={t('language.label')}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <Languages className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lang.toUpperCase()}</span>
            </button>

            {langOpen && (
              <div
                role="listbox"
                aria-label={t('language.label')}
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-50"
              >
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    role="option"
                    aria-selected={lang === opt.code}
                    onClick={() => {
                      setLang(opt.code)
                      setLangOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <span>{opt.flag}</span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {lang === opt.code && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <Button variant="ghost" size="icon" onClick={onToggleDark} className="h-8 w-8" aria-label={t('header.toggleDarkMode')}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* SSE connection */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-slate-500 cursor-default">
                  {isConnected ? (
                    <Wifi className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isConnected ? t('header.apiOnline') : t('header.apiOffline')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Inactivity */}
          {isIdle && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded border border-amber-200 dark:border-amber-700">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">{t('header.inactive')}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
