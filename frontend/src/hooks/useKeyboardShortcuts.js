import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts({ onToggleShortcutsModal, onToggleCommandPalette }) {
  const navigate = useNavigate()
  const pendingKey = useRef(null)
  const pendingTimer = useRef(null)

  const clearPending = useCallback(() => {
    pendingKey.current = null
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore events from input elements
      const tag = e.target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target.isContentEditable
      ) {
        // Still allow Ctrl+K in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault()
          onToggleCommandPalette?.()
        }
        return
      }

      // Ctrl+K → command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onToggleCommandPalette?.()
        return
      }

      // ? → show shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        onToggleShortcutsModal?.()
        return
      }

      // Sequential key combos: G then X
      if (pendingKey.current === 'g') {
        clearPending()
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault()
            navigate('/')
            return
          case 'a':
            e.preventDefault()
            navigate('/alerts')
            return
          case 'r':
            e.preventDefault()
            navigate('/reports')
            return
          default:
            // Unknown second key, ignore
            return
        }
      }

      // Start sequential combo with 'g'
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        pendingKey.current = 'g'
        // Timeout: if second key not pressed within 1s, cancel
        pendingTimer.current = setTimeout(clearPending, 1000)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearPending()
    }
  }, [navigate, onToggleShortcutsModal, onToggleCommandPalette, clearPending])
}
