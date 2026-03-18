// Inactivity timer hook — Implemented in Session S10E
import { useState, useCallback } from 'react'

export function useInactivityTimer(timeoutMs) {
  const [isIdle, setIsIdle] = useState(false)
  const resetTimer = useCallback(() => {
    setIsIdle(false)
  }, [])

  // Full implementation in S10E — will track mousemove, keydown, etc.
  return { isIdle, resetTimer }
}
