import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft, Zap, TrendingUp, Globe, Moon, Loader2, AlertTriangle,
  Clock, CheckCircle2, CircleDot, Check, PauseCircle, XCircle, ArrowUpCircle,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const STATUS_CONFIG = {
  PENDING_REVIEW:  { label: 'Pendente',       variant: 'warning',   Icon: Clock },
  CONFIRMED_FRAUD: { label: 'Fraude',         variant: 'destructive', Icon: XCircle },
  RESOLVED:        { label: 'Resolvido',      variant: 'success',   Icon: CheckCircle2 },
  FALSE_POSITIVE:  { label: 'Falso Positivo', variant: 'secondary', Icon: CircleDot },
  ESCALATED:       { label: 'Escalado',       variant: 'warning',   Icon: ArrowUpCircle },
  NORMAL:          { label: 'Normal',         variant: 'outline',   Icon: Check },
  rate_limited:    { label: 'Limite API',     variant: 'outline',   Icon: PauseCircle },
}

function getRiskLevel(avg) {
  if (avg > 0.90) return { label: 'CRÍTICO', color: 'bg-red-100 text-red-800 border-red-200' }
  if (avg > 0.70) return { label: 'ALTO', color: 'bg-orange-100 text-orange-800 border-orange-200' }
  if (avg >= 0.40) return { label: 'MÉDIO', color: 'bg-amber-100 text-amber-800 border-amber-200' }
  return { label: 'BAIXO', color: 'bg-green-100 text-green-800 border-green-200' }
}

function getSignalSeverity(level) {
  const map = {
    CRÍTICO: { variant: 'destructive', color: 'text-red-600' },
    ALTO: { variant: 'warning', color: 'text-orange-600' },
    BAIXO: { variant: 'outline', color: 'text-green-600' },
  }
  return map[level] || map.BAIXO
}

const COUNTRY_FLAGS = {
  PT: '🇵🇹', ES: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', GB: '🇬🇧',
  US: '🇺🇸', BR: '🇧🇷', NL: '🇳🇱', BE: '🇧🇪', CH: '🇨🇭', AT: '🇦🇹',
  IE: '🇮🇪', LU: '🇱🇺', RU: '🇷🇺', CN: '🇨🇳', NG: '🇳🇬', IN: '🇮🇳',
}

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const bg = s > 0.90 ? 'bg-red-100 text-red-800' : s >= 0.70 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
  return <Badge className={`font-mono text-xs ${bg}`}>{(s * 100).toFixed(1)}%</Badge>
}

export default function MerchantProfile() {
  const { nif } = useParams()
  const navigate = useNavigate()

  const { data: allAlerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['merchant-alerts', nif],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/alerts?limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const arr = Array.isArray(json) ? json : json.alerts || json.items || []
      return arr.filter((a) => a.merchant_nif === nif)
    },
    refetchInterval: 30000,
  })

  const stats = useMemo(() => {
    if (!allAlerts.length) return { total: 0, pending: 0, resolved: 0, falsePositives: 0, avgScore: 0 }
    const total = allAlerts.length
    const pending = allAlerts.filter((a) => a.status === 'PENDING_REVIEW').length
    const resolved = allAlerts.filter((a) => ['RESOLVED', 'CONFIRMED_FRAUD', 'ESCALATED'].includes(a.status)).length
    const falsePositives = allAlerts.filter((a) => a.status === 'FALSE_POSITIVE').length
    const avgScore = allAlerts.reduce((sum, a) => sum + Number(a.anomaly_score || 0), 0) / total
    return { total, pending, resolved, falsePositives, avgScore }
  }, [allAlerts])

  const countries = useMemo(() => {
    const set = new Set(allAlerts.map((a) => a.merchant_country).filter(Boolean))
    return [...set]
  }, [allAlerts])

  const riskLevel = getRiskLevel(stats.avgScore)

  // Activity timeline data
  const timelineData = useMemo(() => {
    return allAlerts
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((a) => ({
        timestamp: a.timestamp,
        amount: Number(a.amount || 0),
        score: Number(a.anomaly_score || 0),
        label: format(new Date(a.timestamp), 'dd/MM HH:mm', { locale: pt }),
      }))
  }, [allAlerts])

  const avgAmount = useMemo(() => {
    if (!timelineData.length) return 0
    return timelineData.reduce((sum, d) => sum + d.amount, 0) / timelineData.length
  }, [timelineData])

  // Risk signals
  const riskSignals = useMemo(() => {
    const maxTx10min = Math.max(...allAlerts.map((a) => Number(a.transactions_last_10min || 0)), 0)
    const maxRatio = Math.max(
      ...allAlerts.map((a) => {
        const prev = Number(a.previous_avg_amount || 0)
        const amt = Number(a.amount || 0)
        return prev > 0 ? amt / prev : 0
      }),
      0
    )
    const distinctCountries = countries.length
    const nightTx = allAlerts.filter((a) => {
      const h = Number(a.hour_of_day ?? -1)
      return h >= 0 && h <= 5
    }).length

    return [
      {
        name: 'Velocidade',
        icon: Zap,
        value: `${maxTx10min} tx / 10min`,
        severity: maxTx10min > 15 ? 'CRÍTICO' : maxTx10min >= 8 ? 'ALTO' : 'BAIXO',
      },
      {
        name: 'Desvio de Montante',
        icon: TrendingUp,
        value: `${maxRatio.toFixed(1)}x média`,
        severity: maxRatio > 5 ? 'CRÍTICO' : maxRatio >= 2 ? 'ALTO' : 'BAIXO',
      },
      {
        name: 'Países Incomuns',
        icon: Globe,
        value: `${distinctCountries} país${distinctCountries !== 1 ? 'es' : ''}`,
        severity: distinctCountries > 3 ? 'CRÍTICO' : distinctCountries >= 2 ? 'ALTO' : 'BAIXO',
      },
      {
        name: 'Horário Nocturno',
        icon: Moon,
        value: `${nightTx} transacções 0h-5h`,
        severity: nightTx > 3 ? 'CRÍTICO' : nightTx >= 1 ? 'ALTO' : 'BAIXO',
      },
    ]
  }, [allAlerts, countries])

  // Last 20 transactions
  const recentTx = useMemo(() => {
    return [...allAlerts]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 20)
  }, [allAlerts])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
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

  if (!isLoading && allAlerts.length === 0) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <AlertTriangle className="h-10 w-10" />
          <p className="text-sm">Sem transacções para este merchant.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1 — MerchantHeader */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-mono text-slate-800">{nif}</h1>
            <div className="flex items-center gap-3">
              <Badge className={`${riskLevel.color} text-xs`}>{riskLevel.label}</Badge>
              <span className="text-xs text-slate-500">
                Score médio: {(stats.avgScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {countries.length > 0 && (
            <div className="flex items-center gap-2">
              {countries.map((c) => (
                <span key={c} className="text-sm" title={c}>
                  {COUNTRY_FLAGS[c] || '🏳️'} {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total transacções" value={stats.total} />
          <StatCard label="Alertas pendentes" value={stats.pending} highlight={stats.pending > 0} />
          <StatCard label="Resolvidos" value={stats.resolved} />
          <StatCard label="Falsos positivos" value={stats.falsePositives} />
        </div>
      </div>

      {/* SECTION 2 — ActivityTimeline */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actividade ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'amount') return [`€${Number(value).toFixed(2)}`, 'Montante']
                    if (name === 'score') return [`${(Number(value) * 100).toFixed(1)}%`, 'Score']
                    return [value, name]
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine
                  y={avgAmount}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: `Média €${avgAmount.toFixed(0)}`, fontSize: 10, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (payload.score > 0.70) {
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#ef4444"
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      )
                    }
                    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#3b82f6" />
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3 — RiskSignals */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Sinais de Risco</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {riskSignals.map((signal) => {
            const sev = getSignalSeverity(signal.severity)
            const SignalIcon = signal.icon
            return (
              <Card key={signal.name}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <SignalIcon className={`h-4 w-4 ${sev.color}`} />
                    <span className="text-xs font-semibold text-slate-700">{signal.name}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{signal.value}</p>
                  <Badge variant={sev.variant} className="text-xs">{signal.severity}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* SECTION 4 — Transaction History */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Últimas Transacções</h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Data/Hora</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Montante</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Score</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTx.map((tx) => {
                  const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.NORMAL
                  const StatusIcon = cfg.Icon
                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {tx.timestamp ? format(new Date(tx.timestamp), 'dd/MM/yyyy HH:mm', { locale: pt }) : '–'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">
                        €{Number(tx.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2"><ScoreBadge score={tx.anomaly_score} /></td>
                      <td className="px-3 py-2">
                        <Badge variant={cfg.variant} className="text-xs gap-1">
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 lowercase">
                        {tx.category?.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  )
                })}
                {recentTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">
                      Sem transacções para este comerciante.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-amber-800' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
