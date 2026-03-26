// Alerts table with TanStack Table v8 — Implemented in Session S09E
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ChevronsUpDown, Clock, CheckCircle2, CircleDot, Check, PauseCircle } from 'lucide-react'
import { getScoreVariant } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'status.pendingReview', variant: 'warning',     Icon: Clock },
  RESOLVED:       { label: 'status.resolved',      variant: 'success',     Icon: CheckCircle2 },
  FALSE_POSITIVE: { label: 'status.falsePositive',variant: 'secondary',   Icon: CircleDot },
  CONFIRMED_FRAUD:{ label: 'status.confirmedFraud',variant: 'destructive', Icon: PauseCircle },
  ESCALATED:      { label: 'status.escalated',     variant: 'warning',    Icon: PauseCircle },
  NORMAL:         { label: 'status.normal',        variant: 'outline',   Icon: Check },
  rate_limited:   { label: 'status.apiLimit',     variant: 'outline',   Icon: PauseCircle },
}

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const variant = getScoreVariant(s)
  return <Badge variant={variant} className="font-mono text-xs">{(s * 100).toFixed(1)}%</Badge>
}

function SortIcon({ column }) {
  if (!column.getIsSorted()) return <ChevronsUpDown className="h-3 w-3 text-slate-400" />
  return column.getIsSorted() === 'desc'
    ? <ChevronDown className="h-3 w-3 text-blue-600" />
    : <ChevronUp className="h-3 w-3 text-blue-600" />
}

const COLUMNS = [
  {
    accessorKey: 'transaction_id',
    header: () => useLanguage().t('columns.id'),
    meta: { headerKey: 'columns.id' },
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-slate-400">{getValue()?.substring(0, 8)}…</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'timestamp',
    header: () => useLanguage().t('columns.dateTime'),
    meta: { headerKey: 'columns.dateTime' },
    cell: ({ getValue }) => getValue()
      ? <span className="text-xs">{new Date(getValue()).toLocaleString('en-US')}</span>
      : '–',
  },
  {
    accessorKey: 'merchant_nif',
    header: () => useLanguage().t('columns.nif'),
    meta: { headerKey: 'columns.nif' },
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
  },
  {
    accessorKey: 'amount',
    header: () => useLanguage().t('columns.amount'),
    meta: { headerKey: 'columns.amount' },
    cell: ({ getValue }) => (
      <span className="font-semibold text-slate-800 dark:text-slate-200">€{Number(getValue() || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: () => useLanguage().t('columns.category'),
    meta: { headerKey: 'columns.category' },
    cell: ({ getValue }) => (
      <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{getValue()?.replace(/_/g, ' ')}</span>
    ),
  },
  {
    accessorKey: 'anomaly_score',
    header: () => useLanguage().t('columns.score'),
    meta: { headerKey: 'columns.score' },
    cell: ({ getValue }) => <ScoreBadge score={getValue()} />,
  },
  {
    accessorKey: 'status',
    header: () => useLanguage().t('columns.status'),
    meta: { headerKey: 'columns.status' },
    cell: ({ getValue }) => {
      const { t } = useLanguage()
      const cfg = STATUS_CONFIG[getValue()] ?? STATUS_CONFIG.NORMAL
      const StatusIcon = cfg.Icon
      return (
        <Badge variant={cfg.variant} className="text-xs gap-1">
          <StatusIcon className="h-3 w-3" />{t(cfg.label)}
        </Badge>
      )
    },
    enableSorting: false,
  },
]

export function AlertsTable({ data, isLoading, onRowClick }) {
  const { t } = useLanguage()
  const [sorting, setSorting] = useState([{ id: 'anomaly_score', desc: true }])

  const table = useReactTable({
    data: useMemo(() => data, [data]),
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  if (isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-400 animate-pulse">{t('alerts.loading')}</p>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 gap-2">
        <p className="text-sm text-slate-500">{t('alerts.noAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
                  >
                    <button
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && <SortIcon column={h.column} />}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {data.length} {t('alerts.count')} — Page {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            ← {t('actions.previous')}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            {t('actions.next')} →
          </Button>
        </div>
      </div>
    </div>
  )
}
