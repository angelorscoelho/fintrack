import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { InactivityOverlay } from '@/components/InactivityOverlay'
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal'
import { useAlertStream } from '@/hooks/useAlertStream'
import { useInactivityTimer } from '@/hooks/useInactivityTimer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Loader2 } from 'lucide-react'

// Lazy-loaded pages (Task 5)
const CommandCenter = lazy(() => import('@/pages/CommandCenter'))
const AlertQueue = lazy(() => import('@/pages/AlertQueue'))
const MerchantIndex = lazy(() => import('@/pages/MerchantIndex'))
const MerchantProfile = lazy(() => import('@/pages/MerchantProfile'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function App() {
  const [isConnected, setIsConnected] = useState(true)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mutateRef = useRef(null)

  // Dark mode
  const { isDark, toggle: toggleDark } = useDarkMode()

  // Inactivity timer — pauses SSE after 30 min idle
  const { isIdle, resetTimer } = useInactivityTimer(
    parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS || '1800000')
  )

  // SSE alert stream — triggers refetch in CommandCenter when a new alert arrives
  const handleNewAlert = useCallback(() => {
    if (mutateRef.current) mutateRef.current()
  }, [])
  useAlertStream(handleNewAlert, isIdle, setIsConnected)

  // Global keyboard shortcuts
  const toggleShortcutsModal = useCallback(() => {
    setShortcutsOpen((prev) => !prev)
  }, [])
  const togglePalette = useCallback(() => {
    setPaletteOpen((prev) => !prev)
  }, [])
  useKeyboardShortcuts({
    onToggleShortcutsModal: toggleShortcutsModal,
    onToggleCommandPalette: togglePalette,
  })

  const handleResume = () => {
    resetTimer()
    if (mutateRef.current) mutateRef.current()
  }

  const setMutateAlerts = useCallback((fn) => { mutateRef.current = fn }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 md:pb-0">
      <Toaster position="top-right" richColors />

      {/* Persistent header */}
      <Header
        isConnected={isConnected}
        isIdle={isIdle}
        isDark={isDark}
        onToggleDark={toggleDark}
      />

      {/* Page content */}
      <main className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-4">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route
              index
              element={
                <CommandCenter
                  isIdle={isIdle}
                  setMutateAlerts={setMutateAlerts}
                  isDark={isDark}
                />
              }
            />
            <Route path="alerts" element={<AlertQueue isDark={isDark} />} />
            <Route path="merchants" element={<MerchantIndex />} />
            <Route path="merchants/:nif" element={<MerchantProfile />} />
            <Route path="reports" element={<ReportsPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile-only bottom navigation */}
      <BottomNav />

      {/* Inactivity overlay — blocks interaction until user resumes */}
      <InactivityOverlay isVisible={isIdle} onResume={handleResume} />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Command Palette */}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteWrapper
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            isDark={isDark}
            onToggleDark={toggleDark}
          />
        </Suspense>
      )}
    </div>
  )
}

// Lazy-load the command palette
const LazyCommandPalette = lazy(() => import('@/components/CommandPalette'))

function CommandPaletteWrapper(props) {
  return <LazyCommandPalette {...props} />
}
