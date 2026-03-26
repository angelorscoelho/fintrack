import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import en from './en.json'
import pt from './pt.json'

const translations = { en, pt }

const STORAGE_KEY = 'fintrack-lang'
const DEFAULT_LANG = 'en'

function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'pt') return stored
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LANG
}

/**
 * Resolve a dot-notation key against a translations object.
 * e.g. resolve('header.brand', en) → 'FinTrack AI'
 */
function resolve(key, obj) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

const LanguageContext = createContext(undefined)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  const setLang = useCallback((newLang) => {
    setLangState(newLang)
    try {
      localStorage.setItem(STORAGE_KEY, newLang)
    } catch {
      // localStorage unavailable
    }
  }, [])

  /**
   * Translate a key. Supports simple interpolation:
   *   t('kpi.since', { time: '14:00', date: '25/03/2026' })
   *   → 'Since 14:00 of 25/03/2026'
   */
  const t = useCallback(
    (key, params) => {
      let value = resolve(key, translations[lang])
      if (value === undefined) {
        // Fallback to English
        value = resolve(key, translations[DEFAULT_LANG])
      }
      if (value === undefined) return key
      if (typeof value !== 'string') return value
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        })
      }
      return value
    },
    [lang],
  )

  const ctx = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={ctx}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
