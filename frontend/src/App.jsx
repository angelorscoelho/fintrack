import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useSwipeable } from 'react-swipeable'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { InactivityOverlay } from '@/components/InactivityOverlay'
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal'
import { DemoBanner } from '@/components/DemoBanner'
import { useAlertStream } from '@/hooks/useAlertStream'
import { useInactivityTimer } from '@/hooks/useInactivityTimer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Loader2 } from 'lucide-react'

// Lazy-loaded pages
const CommandCenter = lazy(() => import('@/pages/CommandCenter'))
const AlertQueue = lazy(() => import('@/pages/AlertQueue'))
const MerchantIndex = lazy(() => import('@/pages/MerchantIndex'))
const MerchantProfile = lazy(() => import('@/pages/MerchantProfile'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const ScoreEvolution = lazy(() => import('@/pages/ScoreEvolution'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
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

  const location = useLocation()
  const navigate = useNavigate()

  const PAGES = ['/', '/alerts', '/merchants', '/reports']
  const currentPageIndex = PAGES.indexOf(location.pathname)
  const isSwipeable = currentPageIndex >= 0

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isSwipeable && currentPageIndex < PAGES.length - 1) {
        navigate(PAGES[currentPageIndex + 1])
      }
    },
    onSwipedRight: () => {
      if (isSwipeable && currentPageIndex > 0) {
        navigate(PAGES[currentPageIndex - 1])
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 50,
  })

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

      {/* Demo mode banner — shown when backend API is unreachable */}
      <DemoBanner />

      {/* Page content */}
      <main {...swipeHandlers} className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-4">
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
            <Route path="transactions" element={<Transactions />} />
            <Route path="score-evolution" element={<ScoreEvolution />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile page dots indicator */}
      {isSwipeable && (
        <div className="fixed bottom-14 inset-x-0 z-30 flex justify-center gap-1.5 py-1 md:hidden">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentPageIndex ? 'w-4 bg-blue-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}

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
