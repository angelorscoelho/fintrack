import { useState, useRef, useCallback, useEffect } from 'react'

export function usePullToRefresh(onRefresh) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current === 0) return
    touchCurrentY.current = e.touches[0].clientY
    const distance = touchCurrentY.current - touchStartY.current
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 120))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true)
      try {
        if (typeof onRefresh === 'function') {
          await onRefresh()
        }
      } finally {
        setIsRefreshing(false)
      }
    }
    touchStartY.current = 0
    touchCurrentY.current = 0
    setPullDistance(0)
  }, [pullDistance, isRefreshing, onRefresh])

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (!isMobile) return

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isRefreshing, pullDistance }
}
