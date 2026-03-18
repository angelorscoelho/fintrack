import { useState, useEffect, useRef, useCallback } from 'react'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'visibilitychange']

export function useInactivityTimer(timeoutMs = 1800000) {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsIdle(false)
    timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    resetTimer()
    const h = () => resetTimer()
    EVENTS.forEach(e => window.addEventListener(e, h, { passive: true }))
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, h))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  return { isIdle, resetTimer }
}
