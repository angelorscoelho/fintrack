import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const FILTER_KEYS = ['status', 'scoreRange', 'category']

/**
 * Bidirectional sync between URL search params and filter state.
 *
 * - On mount: reads URL params → derives initial filter state
 * - On filter change: updates URL (pushes to history for back/forward)
 * - On browser back/forward: URL params update → filters re-derive automatically
 *
 * @returns {{ filters, setFilters, resetFilters, isFromUrl, dismissBanner }}
 */
export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFromUrl, setIsFromUrl] = useState(false)
  const mountRef = useRef(true)

  // On first mount, detect if filters were injected externally (via URL)
  useEffect(() => {
    if (mountRef.current) {
      const hasParam = FILTER_KEYS.some((key) => searchParams.has(key))
      if (hasParam) setIsFromUrl(true)
      mountRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive filter state from URL search params (single source of truth)
  const filters = useMemo(() => ({
    status: searchParams.get('status') || '',
    scoreRange: searchParams.get('scoreRange') || '',
    category: searchParams.get('category') || '',
  }), [searchParams])

  // Update filters → push new URL search params (enables back/forward)
  const setFilters = useCallback((update) => {
    setIsFromUrl(false)
    setSearchParams((prev) => {
      // Support both object and updater-function forms
      const currentFilters = {
        status: prev.get('status') || '',
        scoreRange: prev.get('scoreRange') || '',
        category: prev.get('category') || '',
      }
      const next = typeof update === 'function' ? update(currentFilters) : update
      const params = new URLSearchParams()
      FILTER_KEYS.forEach((key) => {
        if (next[key]) params.set(key, next[key])
      })
      return params
    })
  }, [setSearchParams])

  // Clear all filters and URL params
  const resetFilters = useCallback(() => {
    setIsFromUrl(false)
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const dismissBanner = useCallback(() => setIsFromUrl(false), [])

  return { filters, setFilters, resetFilters, isFromUrl, dismissBanner }
}
