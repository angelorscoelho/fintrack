import { useState, useCallback, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { InactivityOverlay } from '@/components/InactivityOverlay'
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal'
import { useAlertStream } from '@/hooks/useAlertStream'
import { useInactivityTimer } from '@/hooks/useInactivityTimer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import CommandCenter from '@/pages/CommandCenter'
import AlertQueue from '@/pages/AlertQueue'
import MerchantIndex from '@/pages/MerchantIndex'
import MerchantProfile from '@/pages/MerchantProfile'
import ReportsPage from '@/pages/ReportsPage'

export default function App() {
  const [isConnected, setIsConnected] = useState(true)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const mutateRef = useRef(null)

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
  useKeyboardShortcuts({ onToggleShortcutsModal: toggleShortcutsModal })

  const handleResume = () => {
    resetTimer()
    if (mutateRef.current) mutateRef.current()
  }

  const setMutateAlerts = useCallback((fn) => { mutateRef.current = fn }, [])

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0">
      <Toaster position="top-right" richColors />

      {/* Persistent header */}
      <Header isConnected={isConnected} isIdle={isIdle} />

      {/* Page content */}
      <main className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-4">
        <Routes>
          <Route
            index
            element={
              <CommandCenter
                isIdle={isIdle}
                setMutateAlerts={setMutateAlerts}
              />
            }
          />
          <Route path="alerts" element={<AlertQueue />} />
          <Route path="merchants" element={<MerchantIndex />} />
          <Route path="merchants/:nif" element={<MerchantProfile />} />
          <Route path="reports" element={<ReportsPage />} />
        </Routes>
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
    </div>
  )
}
