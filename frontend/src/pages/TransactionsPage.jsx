import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SearchX,
  PlusCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { safeFetch } from '@/lib/api'
import { API_MAX_LIMIT } from '@/lib/constants'
import { useDebounce } from '@/hooks/useDebounce'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatSourceDestination } from '@/lib/formatTransaction'
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''
const PAGE_SIZE = 20
const TABLE_COLS = 6  // Transaction, Merchant, Category, Amount, Date, Status

const categoryColors = {
  retail: 'secondary',
  online: 'default',
  restaurant: 'warning',
  gas_station: 'outline',
  supermarket: 'success',
  electronics: 'default',
  travel: 'destructive',
  pharmacy: 'secondary',
}

const STATUS_I18N_KEY = {
  PENDING_REVIEW:  'status.pendingReview',
  CONFIRMED_FRAUD: 'status.confirmedFraud',
  RESOLVED:        'status.resolved',
  FALSE_POSITIVE:  'status.falsePositive',
  ESCALATED:       'status.escalated',
  NORMAL:          'status.normal',
  rate_limited:    'status.apiLimit',
}

/** URL `minScore`: values >1 are treated as percent (90 → 0.90 on 0–1 anomaly_score scale). */
function parseMinScoreParam(raw) {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (Number.isNaN(n)) return null
  return n > 1 ? n / 100 : n
}

export default function TransactionsPage() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'
  const periodParam = searchParams.get('period')
  const statusParam = searchParams.get('status')
  const minScoreRaw = searchParams.get('minScore')

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // --- Sort state ---
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(0)

  // --- Modal state ---
  const [selectedTx, setSelectedTx] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // --- Debounced search ---
  const debouncedSearch = useDebounce(searchQuery, 300)

  const minScoreThreshold = useMemo(() => parseMinScoreParam(minScoreRaw), [minScoreRaw])
  const urlQueryActive =
    periodParam === '24h' || Boolean(statusParam) || minScoreThreshold != null

  // --- Data fetching ---
  const { data: transactions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`)
      const json = await res.json()
      return Array.isArray(json) ? json : json.alerts || json.items || []
    },
  })

  // --- Computed: has active filters ---
  const hasActiveFilters =
    debouncedSearch !== '' ||
    category !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    urlQueryActive

  // --- Reset filters ---
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setCategory('all')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(0)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      ;['period', 'status', 'minScore', 'category'].forEach((k) => next.delete(k))
      return next
    })
  }, [setSearchParams])

  // --- Filtered + sorted data ---
  const processedData = useMemo(() => {
    let result = transactions

    // Search: accounts, legacy merchant fields, category, id
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter((tx) => {
        const route = formatSourceDestination(tx).toLowerCase()
        const legacy = (tx.merchant_name || tx.merchant_nif || '').toLowerCase()
        const desc = (tx.category || '').toLowerCase()
        const txId = (tx.transaction_id || '').toLowerCase()
        return route.includes(q) || legacy.includes(q) || desc.includes(q) || txId.includes(q)
      })
    }

    // Category filter
    if (category && category !== 'all') {
      result = result.filter((tx) => tx.category === category)
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((tx) => new Date(tx.timestamp) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((tx) => new Date(tx.timestamp) <= to)
    }

    // URL-driven filters (dashboard KPI deep links)
    if (periodParam === '24h') {
      const cutoff = Date.now() - 86400000
      result = result.filter((tx) => new Date(tx.timestamp).getTime() >= cutoff)
    }
    if (statusParam) {
      result = result.filter((tx) => tx.status === statusParam)
    }
    if (minScoreThreshold != null) {
      result = result.filter((tx) => Number(tx.anomaly_score ?? 0) >= minScoreThreshold)
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') {
        cmp = new Date(a.timestamp) - new Date(b.timestamp)
      } else if (sortField === 'amount') {
        cmp = Number(a.amount) - Number(b.amount)
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [
    transactions,
    debouncedSearch,
    category,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
    periodParam,
    statusParam,
    minScoreThreshold,
  ])

  // Reset page when filters change
  const filteredCount = processedData.length
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages - 1)
  const pageData = processedData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // --- Sort toggle handler ---
  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('desc')
      return field
    })
    setCurrentPage(0)
  }, [])

  // --- Row click handler ---
  const handleRowClick = useCallback((tx) => {
    setSelectedTx(tx)
    setModalOpen(true)
  }, [])

  // --- Sort icon helper ---
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />
  }

  return (
    <>
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('actions.backToDashboard')}
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('transactions.title')}</h1>
          <p className="text-xs text-muted-foreground">
            {filteredCount} {filteredCount !== 1 ? t('transactions.plural') : t('transactions.singular')}
            {hasActiveFilters ? ` ${t('transactions.filtered')}` : ''}
          </p>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorState onRetry={() => refetch()} />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <TransactionFilters
            searchQuery={searchQuery}
            onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(0) }}
            category={category}
            onCategoryChange={(v) => { setCategory(v); setCurrentPage(0) }}
            dateFrom={dateFrom}
            onDateFromChange={(v) => { setDateFrom(v); setCurrentPage(0) }}
            dateTo={dateTo}
            onDateToChange={(v) => { setDateTo(v); setCurrentPage(0) }}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('transactions.history')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={6} cols={TABLE_COLS} />
          ) : filteredCount === 0 ? (
            /* Empty state — distinguish "no data at all" vs "filtered away" */
            transactions.length === 0 ? (
              <EmptyState
                icon={PlusCircle}
                title={t('transactions.noTransactions')}
                description={t('transactions.noTransactionsDesc')}
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title={t('transactions.noMatch')}
                description={t('transactions.noMatchDesc')}
                actionLabel={t('actions.resetFilters')}
                onAction={resetFilters}
              />
            )
          ) : (
            <>
              {/* Table — desktop */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        {t('columns.transaction')}
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        {t('columns.sourceDestination')}
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        {t('columns.category')}
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort('amount')}
                      >
                        <span className="inline-flex items-center">
                          {t('columns.amount')}
                          <SortIcon field="amount" />
                        </span>
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <span className="inline-flex items-center">
                          {t('columns.date')}
                          <SortIcon field="date" />
                        </span>
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        {t('columns.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((tx) => (
                      <tr
                        key={tx.transaction_id}
                        onClick={() => handleRowClick(tx)}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {tx.transaction_id}
                        </td>
                        <td className="px-4 py-3 max-w-[220px] truncate text-sm" title={formatSourceDestination(tx)}>
                          {formatSourceDestination(tx)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={categoryColors[tx.category] || 'outline'} className="text-xs">
                            {tx.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          €{Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.timestamp ? format(new Date(tx.timestamp), 'MMM d, HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              tx.status === 'NORMAL'
                                ? 'success'
                                : tx.status === 'PENDING_REVIEW'
                                  ? 'warning'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {t(STATUS_I18N_KEY[tx.status] ?? 'status.normal')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {t('transactions.page', { current: safePage + 1, total: totalPages, count: filteredCount })}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('actions.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      {t('actions.next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction detail modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
