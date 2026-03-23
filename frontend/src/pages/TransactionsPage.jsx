import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { safeFetch } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal'

const API_BASE = import.meta.env.VITE_API_URL || ''
const PAGE_SIZE = 20

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

export default function TransactionsPage() {
  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
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

  // --- Data fetching ---
  const { data: transactions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=200`)
      const json = await res.json()
      return Array.isArray(json) ? json : json.alerts || json.items || []
    },
  })

  // --- Computed: has active filters ---
  const hasActiveFilters = debouncedSearch !== '' || category !== 'all' || dateFrom !== '' || dateTo !== ''

  // --- Reset filters ---
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setCategory('all')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(0)
  }, [])

  // --- Filtered + sorted data ---
  const processedData = useMemo(() => {
    let result = transactions

    // Search filter (description uses merchant_nif / merchant_name + category as proxy)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter((tx) => {
        const merchant = (tx.merchant_name || tx.merchant_nif || '').toLowerCase()
        const desc = (tx.category || '').toLowerCase()
        const txId = (tx.transaction_id || '').toLowerCase()
        return merchant.includes(q) || desc.includes(q) || txId.includes(q)
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
  }, [transactions, debouncedSearch, category, dateFrom, dateTo, sortField, sortDirection])

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
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-xs text-muted-foreground">
            {filteredCount} transaction{filteredCount !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtered)' : ''}
          </p>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Erro ao carregar dados. Tente novamente.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-3 shrink-0">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
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
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : filteredCount === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <SearchX className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium mb-3">No transactions match your filters.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table — desktop */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Transaction
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Merchant
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Category
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort('amount')}
                      >
                        <span className="inline-flex items-center">
                          Amount
                          <SortIcon field="amount" />
                        </span>
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <span className="inline-flex items-center">
                          Date
                          <SortIcon field="date" />
                        </span>
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Status
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
                        <td className="px-4 py-3">
                          {tx.merchant_name || tx.merchant_nif}
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
                            {tx.status}
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
                    Page {safePage + 1} of {totalPages} · {filteredCount} total
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
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
