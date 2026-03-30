import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MOCK_ALERTS, MOCK_STATS } from '@/lib/mockData'
import { API_MAX_LIMIT } from '@/lib/constants'

const API_BASE = (import.meta.env.VITE_API_URL || '').trim()
const API_TIMEOUT_MS = 5000

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchTransactionData() {
  if (!API_BASE) {
    return {
      data: { alerts: MOCK_ALERTS, stats: MOCK_STATS },
      isMockMode: true,
      error: null,
    }
  }

  try {
    const [statsJson, alertsJson] = await Promise.all([
      fetchJsonWithTimeout(`${API_BASE}/api/stats`, API_TIMEOUT_MS),
      fetchJsonWithTimeout(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`, API_TIMEOUT_MS),
    ])

    const alerts = Array.isArray(alertsJson)
      ? alertsJson
      : alertsJson?.items || alertsJson?.alerts || []

    return {
      data: { alerts, stats: statsJson || {} },
      isMockMode: false,
      error: null,
    }
  } catch (err) {
    return {
      data: { alerts: MOCK_ALERTS, stats: MOCK_STATS },
      isMockMode: true,
      error: err instanceof Error ? err : new Error('Unknown API connection error'),
    }
  }
}

export function useTransactionData() {
  const query = useQuery({
    queryKey: ['transaction-data', API_BASE || 'mock-only'],
    queryFn: fetchTransactionData,
    refetchInterval: 30000,
  })

  const payload = query.data || null

  return useMemo(
    () => ({
      data: payload?.data || { alerts: [], stats: {} },
      isLoading: query.isLoading,
      isMockMode: Boolean(payload?.isMockMode),
      error: payload?.error || (query.isError ? query.error : null),
      refetch: query.refetch,
    }),
    [payload, query.isLoading, query.isError, query.error, query.refetch]
  )
}
