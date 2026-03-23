import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SARExportButton, generateSARPdf, getExportCount } from '@/components/reports/SARExportButton'
import {
  FileText,
  AlertTriangle,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { safeFetch } from '@/lib/api'

const API_BASE = import.meta.env.VITE_API_URL || ''

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const pct = (s * 100).toFixed(1)
  const variant = s > 0.90 ? 'destructive' : s >= 0.70 ? 'warning' : 'outline'
  return <Badge variant={variant}>{pct}%</Badge>
}

function StatusBadge({ status }) {
  const map = {
    PENDING_REVIEW: { label: 'Pendente', variant: 'warning' },
    RESOLVED: { label: 'Resolvido', variant: 'success' },
    FALSE_POSITIVE: { label: 'Falso Positivo', variant: 'secondary' },
    CONFIRMED_FRAUD: { label: 'Fraude', variant: 'destructive' },
    ESCALATED: { label: 'Escalado', variant: 'default' },
    NORMAL: { label: 'Normal', variant: 'outline' },
    rate_limited: { label: 'Limite API', variant: 'outline' },
  }
  const st = map[status] || { label: status, variant: 'outline' }
  return <Badge variant={st.variant}>{st.label}</Badge>
}

const columns = [
  {
    accessorKey: 'timestamp',
    header: 'Data',
    cell: ({ getValue }) => {
      const v = getValue()
      if (!v) return '—'
      try {
        return format(new Date(v), 'dd MMM yyyy HH:mm')
      } catch {
        return v
      }
    },
  },
  {
    accessorKey: 'merchant_nif',
    header: 'Merchant NIF',
  },
  {
    accessorKey: 'anomaly_score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Score
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ getValue }) => <ScoreBadge score={getValue()} />,
    sortingFn: 'basic',
  },
  {
    accessorKey: 'amount',
    header: 'Montante',
    cell: ({ getValue }) => {
      const v = getValue()
      return v != null ? `€${Number(v).toFixed(2)}` : '—'
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  },
  {
    id: 'export',
    header: 'Exportar',
    cell: ({ row }) => (
      <SARExportButton
        sarContent={row.original.sar_draft}
        transactionId={row.original.transaction_id}
        merchantNif={row.original.merchant_nif}
        score={row.original.anomaly_score}
      />
    ),
  },
]

export default function ReportsPage() {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState([{ id: 'anomaly_score', desc: true }])
  const [zipLoading, setZipLoading] = useState(false)
  const [zipProgress, setZipProgress] = useState('')
  const [exportCount, setExportCount] = useState(getExportCount)

  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts-for-reports'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=200`)
      const json = await res.json()
      const arr = Array.isArray(json) ? json : json.alerts || json.items || []
      return arr
    },
    staleTime: 10000,
  })

  const sarAlerts = useMemo(
    () => alerts.filter((a) => a.sar_draft != null),
    [alerts]
  )

  const criticalPending = useMemo(
    () =>
      sarAlerts.filter(
        (a) =>
          a.status === 'PENDING_REVIEW' && Number(a.anomaly_score) > 0.90
      ).length,
    [sarAlerts]
  )

  // Refresh export count after any individual export
  const refreshExportCount = useCallback(() => {
    setExportCount(getExportCount())
  }, [])

  // Poll export count periodically when page is active
  // (simpler than event bus — localStorage change detection)
  useEffect(() => {
    const interval = setInterval(refreshExportCount, 2000)
    return () => clearInterval(interval)
  }, [refreshExportCount])

  const table = useReactTable({
    data: sarAlerts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const handleExportAll = useCallback(async () => {
    if (sarAlerts.length === 0) return
    setZipLoading(true)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      const { jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      for (let i = 0; i < sarAlerts.length; i++) {
        const alert = sarAlerts[i]
        setZipProgress(`Gerando ${i + 1} de ${sarAlerts.length} PDFs...`)

        // Create a temporary hidden div to render the markdown
        const container = document.createElement('div')
        container.style.cssText =
          'position:absolute;left:-9999px;top:0;width:700px;padding:24px;background:#fff;font-family:sans-serif;font-size:14px;line-height:1.6;color:#1e293b;'
        document.body.appendChild(container)

        const { createRoot } = await import('react-dom/client')
        const ReactMarkdown = (await import('react-markdown')).default
        const root = createRoot(container)
        await new Promise((resolve) => {
          root.render(
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{alert.sar_draft}</ReactMarkdown>
            </div>
          )
          setTimeout(resolve, 300)
        })

        try {
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          })

          const pdf = new jsPDF('p', 'mm', 'a4')
          const pageWidth = pdf.internal.pageSize.getWidth()
          const pageHeight = pdf.internal.pageSize.getHeight()
          const margin = 15
          const contentWidth = pageWidth - margin * 2
          const footerY = pageHeight - 10
          const today = new Date().toISOString().split('T')[0]
          const scorePct = (Number(alert.anomaly_score) * 100).toFixed(1)

          pdf.setFontSize(12)
          pdf.setFont(undefined, 'bold')
          pdf.text('RELATÓRIO DE ATIVIDADE SUSPEITA — CONFIDENCIAL', pageWidth / 2, 15, { align: 'center' })

          pdf.setFontSize(9)
          pdf.setFont(undefined, 'normal')
          pdf.text(
            `Transação: ${alert.transaction_id} | Merchant: ${alert.merchant_nif} | Score: ${scorePct}% | Data: ${today}`,
            pageWidth / 2,
            22,
            { align: 'center' }
          )

          pdf.setDrawColor(200)
          pdf.line(margin, 26, pageWidth - margin, 26)

          const imgData = canvas.toDataURL('image/png')
          const imgWidth = contentWidth
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          const contentStartY = 30
          const maxContentHeight = footerY - contentStartY - 10

          if (imgHeight <= maxContentHeight) {
            pdf.addImage(imgData, 'PNG', margin, contentStartY, imgWidth, imgHeight)
          } else {
            let remainingHeight = canvas.height
            let sourceY = 0
            const sliceHeightPx = (maxContentHeight / imgWidth) * canvas.width
            let isFirstPage = true

            while (remainingHeight > 0) {
              if (!isFirstPage) pdf.addPage()
              const currentSliceHeight = Math.min(sliceHeightPx, remainingHeight)
              const currentSliceHeightMm = (currentSliceHeight * imgWidth) / canvas.width

              const sliceCanvas = document.createElement('canvas')
              sliceCanvas.width = canvas.width
              sliceCanvas.height = currentSliceHeight
              const ctx = sliceCanvas.getContext('2d')
              ctx.drawImage(canvas, 0, sourceY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight)

              const sliceData = sliceCanvas.toDataURL('image/png')
              pdf.addImage(sliceData, 'PNG', margin, isFirstPage ? contentStartY : margin, imgWidth, currentSliceHeightMm)

              sourceY += currentSliceHeight
              remainingHeight -= currentSliceHeight
              isFirstPage = false
            }
          }

          const totalPages = pdf.internal.getNumberOfPages()
          for (let p = 1; p <= totalPages; p++) {
            pdf.setPage(p)
            pdf.setFontSize(7)
            pdf.setTextColor(150)
            pdf.text(
              'Gerado automaticamente por FinTrack AI — Requer revisão humana',
              pageWidth / 2,
              footerY,
              { align: 'center' }
            )
            pdf.setTextColor(0)
          }

          const pdfBlob = pdf.output('blob')
          zip.file(`SAR_${alert.transaction_id}_${today}.pdf`, pdfBlob)
        } finally {
          root.unmount()
          document.body.removeChild(container)
        }
      }

      setZipProgress('Criando ZIP...')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const today = new Date().toISOString().split('T')[0]
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FinTrack_SARs_${today}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${sarAlerts.length} PDFs exportados como ZIP`)
    } catch (err) {
      console.error('ZIP generation error:', err)
      toast.error('Erro ao gerar ZIP')
    } finally {
      setZipLoading(false)
      setZipProgress('')
    }
  }, [sarAlerts])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Relatórios SAR</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Erro ao carregar dados. Tente novamente.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-3 shrink-0">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Relatórios SAR</h1>

      {/* SECTION 1 — Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">SARs Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{sarAlerts.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Críticos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{criticalPending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Exportados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{exportCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2 — SARs table */}
      {sarAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <FileText className="h-10 w-10" />
          <p className="text-sm">Nenhum SAR gerado ainda.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/alerts')}>
            Ver alertas
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b bg-slate-50">
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left font-medium text-slate-600">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
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
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">
              Página {table.getState().pagination.pageIndex + 1} de{' '}
              {table.getPageCount()}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 — Export All */}
      {sarAlerts.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleExportAll}
            disabled={zipLoading}
            className="gap-2"
          >
            {zipLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {zipProgress || 'A gerar...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar Todos como ZIP
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
