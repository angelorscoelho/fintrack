// Alerts table with TanStack Table v8 — Implemented in Session S09E
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ChevronsUpDown, Clock, CheckCircle2, CircleDot, Check, PauseCircle } from 'lucide-react'

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pendente',      variant: 'warning',     Icon: Clock },
  RESOLVED:       { label: 'Resolvido',     variant: 'success',     Icon: CheckCircle2 },
  FALSE_POSITIVE: { label: 'Falso Positivo',variant: 'secondary',   Icon: CircleDot },
  NORMAL:         { label: 'Normal',        variant: 'outline',     Icon: Check },
  rate_limited:   { label: 'Limite API',    variant: 'outline',     Icon: PauseCircle },
}

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const variant = s > 0.90 ? 'destructive' : s >= 0.70 ? 'warning' : 'outline'
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
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-slate-400">{getValue()?.substring(0, 8)}…</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'timestamp',
    header: 'Data/Hora',
    cell: ({ getValue }) => getValue()
      ? <span className="text-xs">{new Date(getValue()).toLocaleString('pt-PT')}</span>
      : '–',
  },
  {
    accessorKey: 'merchant_nif',
    header: 'NIF',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Montante',
    cell: ({ getValue }) => (
      <span className="font-semibold text-slate-800">€{Number(getValue() || 0).toFixed(2)}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ getValue }) => (
      <span className="text-xs capitalize text-slate-600">{getValue()?.replace(/_/g, ' ')}</span>
    ),
  },
  {
    accessorKey: 'anomaly_score',
    header: 'Risco',
    cell: ({ getValue }) => <ScoreBadge score={getValue()} />,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
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
  },
]

export function AlertsTable({ data, isLoading, onRowClick }) {
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
      <div className="flex items-center justify-center h-48 bg-white rounded-lg border border-slate-200">
        <p className="text-sm text-slate-400 animate-pulse">A carregar alertas…</p>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-lg border border-slate-200 gap-2">
        <p className="text-sm text-slate-500">Sem alertas para o filtro selecionado.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
                  >
                    <button
                      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
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
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500">
          {data.length} alertas — Página {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            ← Anterior
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próxima →
          </Button>
        </div>
      </div>
    </div>
  )
}
