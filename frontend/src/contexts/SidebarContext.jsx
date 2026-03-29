import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const SidebarContext = createContext(null)

const STORAGE_KEY_OPEN = 'fintrack_ai_sidebar_open'

function readStoredOpen() {
  try {
    const v = localStorage.getItem(STORAGE_KEY_OPEN)
    if (v === 'true') return true
    if (v === 'false') return false
  } catch {
    // ignore
  }
  return false
}

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(readStoredOpen)
  const [currentContext, setCurrentContext] = useState(null)

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY_OPEN, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const setContext = useCallback((ctx) => {
    setCurrentContext(ctx ?? null)
  }, [])

  const value = useMemo(
    () => ({ isOpen, toggle, setContext, currentContext }),
    [isOpen, toggle, setContext, currentContext],
  )

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return ctx
}
