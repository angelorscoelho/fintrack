import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useMemo, useState, useCallback, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Loader2,
  Clock,
  CheckCircle2,
  CircleDot,
  Check,
  PauseCircle,
  Cpu,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { AlertDetail } from '@/components/AlertDetail'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

const API_BASE = import.meta.env.VITE_API_URL || ''

const STATUS_CONFIG = {
  PENDING_REVIEW:  { label: 'Pending Review',       variant: 'warning',   Icon: Clock },
  CONFIRMED_FRAUD: { label: 'Confirmed Fraud',        variant: 'destructive', Icon: XCircle },
  RESOLVED:        { label: 'Resolved',               variant: 'success',   Icon: CheckCircle2 },
  FALSE_POSITIVE:  { label: 'False Positive',        variant: 'secondary', Icon: CircleDot },
  ESCALATED:       { label: 'Escalated',              variant: 'warning',   Icon: ArrowUpCircle },
  NORMAL:          { label: 'Normal',                variant: 'outline',   Icon: Check },
  rate_limited:    { label: 'API Limit',              variant: 'outline',   Icon: PauseCircle },
}

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const variant = s > 0.90 ? 'destructive' : s >= 0.70 ? 'warning' : 'outline'
  const bg = s > 0.90 ? 'bg-red-100 text-red-800 border-red-200' : s >= 0.70 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
  return <Badge variant={variant} className={`font-mono text-xs ${bg}`}>{(s * 100).toFixed(1)}%</Badge>
}

function SortIcon({ column }) {
  if (!column.getIsSorted()) return <ChevronsUpDown className="h-3 w-3 text-slate-400" />
  return column.getIsSorted() === 'desc'
    ? <ChevronDown className="h-3 w-3 text-blue-600" />
    : <ChevronUp className="h-3 w-3 text-blue-600" />
}

function InlineActionButton({ icon: Icon, title, className, loading, onClick }) {
  return (
    <button
      title={title}
      className={`p-1.5 rounded-md transition-colors hover:bg-opacity-20 disabled:opacity-40 ${className}`}
      disabled={loading}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </button>
  )
}

function ExpandedRowPanel({ alert, onOpenDetail, onResolved }) {
  let explanation = null
  if (alert.ai_explanation) {
    try {
      explanation = typeof alert.ai_explanation === 'string'
        ? JSON.parse(alert.ai_explanation)
        : alert.ai_explanation
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-slate-50 border-t border-b border-slate-200 px-6 py-4 space-y-3">
      {/* XAI bullets */}
      {explanation && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <Cpu className="h-3.5 w-3.5" />
            AI Analysis
          </div>
          {explanation.summary_pt && (
            <p className="text-xs text-slate-600 italic">{explanation.summary_pt}</p>
          )}
          <ul className="space-y-1">
            {(explanation.bullets || []).map((b) => (
              <li key={b.id} className="flex gap-2 text-xs text-slate-700">
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SAR badge */}
      {alert.sar_draft && (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-red-600" />
          <Badge variant="destructive" className="text-xs">SAR Available</Badge>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={(e) => { e.stopPropagation(); onOpenDetail(alert) }}
        >
          <ChevronRight className="h-3 w-3" />
          View full details
        </Button>

        {alert.status === 'PENDING_REVIEW' && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-500 mr-1">Resolve:</span>
            <ResolveButton alert={alert} type="FALSE_POSITIVE" label="False Positive" onResolved={onResolved} />
            <ResolveButton alert={alert} type="CONFIRMED_FRAUD" label="Confirmed Fraud" onResolved={onResolved} />
            <ResolveButton alert={alert} type="ESCALATED" label="Escalated" onResolved={onResolved} />
          </div>
        )}
      </div>
    </div>
  )
}

function ResolveButton({ alert, type, label, onResolved }) {
  const [loading, setLoading] = useState(false)

  const config = {
    FALSE_POSITIVE: { variant: 'outline', cls: 'border-blue-400 text-blue-700 hover:bg-blue-50' },
    CONFIRMED_FRAUD: { variant: 'destructive', cls: '' },
    ESCALATED: { variant: 'secondary', cls: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
  }
  const c = config[type] || { variant: 'outline', cls: '' }

  const handle = async (e) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alert.transaction_id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: type }),
      })
      if (res.status === 409) {
        toast.info('Already resolved')
      } else if (res.ok) {
        toast.success(`Alert marked as ${label}.`)
        onResolved()
      } else {
        toast.error(`Error: HTTP ${res.status}`)
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant={c.variant} className={`h-6 text-xs px-2 ${c.cls}`} disabled={loading} onClick={handle}>
      {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
      {label}
    </Button>
  )
}

export function EnhancedAlertsTable({ data = [], isLoading, onRefetch, onSelectionChange, clearSelectionRef }) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState([{ id: 'anomaly_score', desc: true }])
  const [rowSelection, setRowSelection] = useState({})
  const [expanded, setExpanded] = useState({})
  const [focusedRowIndex, setFocusedRowIndex] = useState(0)
  const [resolvingRows, setResolvingRows] = useState({})
  const [detailAlert, setDetailAlert] = useState(null)
  const tableRef = useRef(null)

  // Expose clear selection to parent
  if (clearSelectionRef) {
    clearSelectionRef.current = () => setRowSelection({})
  }

  const resolveInline = async (alert, type, label) => {
    const key = `${alert.transaction_id}_${type}`
    setResolvingRows((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alert.transaction_id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: type }),
      })
      if (res.status === 409) {
        toast.info('Already resolved')
      } else if (res.ok) {
        toast.success(`Alert marked as ${label}.`)
        if (onRefetch) onRefetch()
      } else {
        toast.error(`Error: HTTP ${res.status}`)
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setResolvingRows((prev) => ({ ...prev, [key]: false }))
    }
  }

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-slate-300 cursor-pointer"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-slate-300 cursor-pointer"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: 'anomaly_score',
        header: 'Score',
        cell: ({ getValue }) => <ScoreBadge score={getValue()} />,
        size: 90,
      },
      {
        accessorKey: 'transaction_id',
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-slate-500">{getValue()?.substring(0, 8)}…</span>
        ),
        enableSorting: false,
        size: 100,
      },
      {
        accessorKey: 'merchant_nif',
        header: 'NIF',
        cell: ({ getValue }) => {
          const nif = getValue()
          return (
            <button
              className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/merchants/${nif}`)
              }}
            >
              {nif}
            </button>
          )
        },
        enableSorting: false,
        size: 130,
      },
      {
        accessorKey: 'amount',
        header: () => <span className="w-full text-right block">Amount</span>,
        cell: ({ getValue }) => (
          <span className="font-semibold text-slate-800 block text-right">
            €{Number(getValue() || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => (
          <span className="text-xs text-slate-600 lowercase">
            {getValue()?.replace(/_/g, ' ')}
          </span>
        ),
        enableSorting: false,
        size: 120,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const cfg = STATUS_CONFIG[getValue()] ?? STATUS_CONFIG.NORMAL
          const StatusIcon = cfg.Icon
          return (
            <Badge variant={cfg.variant} className="text-xs gap-1">
              <StatusIcon className="h-3 w-3" />{cfg.label}
            </Badge>
          )
        },
        enableSorting: false,
        size: 130,
      },
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ getValue }) => {
          const ts = getValue()
          if (!ts) return <span className="text-xs text-slate-400">–</span>
          try {
            return (
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(ts), { addSuffix: true, locale: pt })}
              </span>
            )
          } catch {
            return <span className="text-xs text-slate-400">–</span>
          }
        },
        size: 120,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const alert = row.original
          if (alert.status !== 'PENDING_REVIEW') {
            return <span className="text-xs text-slate-300">—</span>
          }
          const id = alert.transaction_id
          return (
            <div className="flex items-center gap-0.5">
              <InlineActionButton
                icon={CheckCircle}
                title="False Positive"
                className="text-green-600 hover:bg-green-100"
                loading={resolvingRows[`${id}_FALSE_POSITIVE`]}
                onClick={() => resolveInline(alert, 'FALSE_POSITIVE', 'False Positive')}
              />
              <InlineActionButton
                icon={XCircle}
                title="Confirmed Fraud"
                className="text-red-600 hover:bg-red-100"
                loading={resolvingRows[`${id}_CONFIRMED_FRAUD`]}
                onClick={() => resolveInline(alert, 'CONFIRMED_FRAUD', 'Confirmed Fraud')}
              />
              <InlineActionButton
                icon={ArrowUpCircle}
                title="Escalate"
                className="text-amber-600 hover:bg-amber-100"
                loading={resolvingRows[`${id}_ESCALATED`]}
                onClick={() => resolveInline(alert, 'ESCALATED', 'Escalated')}
              />
            </div>
          )
        },
        enableSorting: false,
        size: 110,
      },
    ],
    [navigate, resolvingRows]
  )

  const table = useReactTable({
    data: useMemo(() => data, [data]),
    columns,
    state: { sorting, rowSelection, expanded },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableRowSelection: true,
    initialState: { pagination: { pageSize: 20 } },
  })

  const rows = table.getRowModel().rows
  const pageRows = rows

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.min(prev + 1, pageRows.length - 1))
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === ' ') {
        e.preventDefault()
        const row = pageRows[focusedRowIndex]
        if (row) row.toggleExpanded()
      } else if (e.key === 'f' || e.key === 'F') {
        const row = pageRows[focusedRowIndex]
        if (row && row.original.status === 'PENDING_REVIEW') {
          e.preventDefault()
          resolveInline(row.original, 'FALSE_POSITIVE', 'Falso Positivo')
        }
      } else if (e.key === 'x' || e.key === 'X') {
        const row = pageRows[focusedRowIndex]
        if (row && row.original.status === 'PENDING_REVIEW') {
          e.preventDefault()
          resolveInline(row.original, 'CONFIRMED_FRAUD', 'Fraude Confirmada')
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pageRows, focusedRowIndex])

  // Get selected row data for BulkActionBar
  const selectedRowData = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => rows[parseInt(key)]?.original)
      .filter(Boolean)
  }, [rowSelection, rows])

  // Notify parent of selection changes — use ref to avoid infinite loop
  const prevSelectionKeyRef = useRef('')
  useEffect(() => {
    const key = Object.keys(rowSelection).filter((k) => rowSelection[k]).sort().join(',')
    if (onSelectionChange && key !== prevSelectionKeyRef.current) {
      prevSelectionKeyRef.current = key
      onSelectionChange(selectedRowData)
    }
  }, [selectedRowData, onSelectionChange, rowSelection])

  if (isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading alerts…
        </div>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-lg border border-slate-200 gap-2">
        <p className="text-sm text-slate-500">No alerts for the selected filter.</p>
      </div>
    )
  }

  return (
    <>
      <div ref={tableRef} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      style={{ width: h.getSize() }}
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <SortIcon column={h.column} />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((row, idx) => (
                <Fragment key={row.id}>
                  <tr
                    className={`transition-colors cursor-pointer ${
                      idx === focusedRowIndex ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/50'
                    } ${row.getIsExpanded() ? 'bg-slate-50' : ''}`}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr>
                      <td colSpan={columns.length}>
                        <ErrorBoundary>
                          <ExpandedRowPanel
                            alert={row.original}
                            onOpenDetail={setDetailAlert}
                            onResolved={() => onRefetch && onRefetch()}
                          />
                        </ErrorBoundary>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500">
            {data.length} alerts — Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ← Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Detail Sheet */}
      <AlertDetail
        alert={detailAlert}
        open={!!detailAlert}
        onClose={() => setDetailAlert(null)}
        onResolved={() => {
          setDetailAlert(null)
          if (onRefetch) onRefetch()
        }}
      />
    </>
  )
}
