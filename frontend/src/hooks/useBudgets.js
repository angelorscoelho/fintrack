import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fintrack-budgets'

const CATEGORIES = [
  'retail',
  'online',
  'restaurant',
  'gas_station',
  'supermarket',
  'electronics',
  'travel',
  'pharmacy',
]

const DEFAULT_LIMITS = {
  retail: 500,
  online: 300,
  restaurant: 200,
  gas_station: 150,
  supermarket: 400,
  electronics: 600,
  travel: 1000,
  pharmacy: 100,
}

function loadBudgets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure all categories are present
      const merged = { ...DEFAULT_LIMITS }
      for (const cat of CATEGORIES) {
        if (typeof parsed[cat] === 'number' && parsed[cat] >= 0) {
          merged[cat] = parsed[cat]
        }
      }
      return merged
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_LIMITS }
}

function saveBudgets(budgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets))
}

/**
 * Hook to manage per-category budget limits with localStorage persistence.
 */
export function useBudgets() {
  const [budgets, setBudgets] = useState(loadBudgets)

  const updateBudget = useCallback((category, amount) => {
    setBudgets((prev) => {
      const next = { ...prev, [category]: Math.max(0, Number(amount) || 0) }
      saveBudgets(next)
      return next
    })
  }, [])

  return { budgets, updateBudget, categories: CATEGORIES }
}
