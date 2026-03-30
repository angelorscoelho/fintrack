import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTransactionData } from '@/hooks/useTransactionData'
import { requestGemini } from '@/lib/aiApi'

const API_BASE = (import.meta.env.VITE_API_URL || '').trim()

const COUNTRY_CENTROIDS = {
  PT: [39.3999, -8.2245], ES: [40.4637, -3.7492], FR: [46.2276, 2.2137], DE: [51.1657, 10.4515],
  GB: [55.3781, -3.436], IT: [41.8719, 12.5674], NL: [52.1326, 5.2913], US: [37.0902, -95.7129],
  CN: [35.8617, 104.1954], BR: [-14.235, -51.9253],
}

function txPrompt(tx) {
  return `Analisa esta transacao para detecao de fraude financeira. Dados: ID=${tx.transaction_id}, Valor=${Number(tx.amount ?? 0).toFixed(2)}€, Origem=${tx.source_account || '—'}, Destino=${tx.destination_account || '—'}, Categoria=${tx.category || '—'}, Pais de Origem=${tx.source_country || '—'}, Metodo de Pagamento=${tx.payment_platform || '—'}, Score de Anomalia=${(Number(tx.anomaly_score ?? 0) * 100).toFixed(1)}%, Status=${tx.status || '—'}. Identifica os principais red flags, que padrao de fraude pode estar associado, e recomendacoes de accao. Se conciso. Responde em portugues de Portugal.`
}

function sarPrompt(tx) {
  return `Gera um Suspicious Activity Report (SAR) estruturado para esta transacao: ID=${tx.transaction_id}, Valor=${Number(tx.amount ?? 0).toFixed(2)}€, Origem=${tx.source_account || '—'}, Destino=${tx.destination_account || '—'}, Categoria=${tx.category || '—'}, Pais de Origem=${tx.source_country || '—'}, Metodo de Pagamento=${tx.payment_platform || '—'}, Score de Anomalia=${(Number(tx.anomaly_score ?? 0) * 100).toFixed(1)}%, Status=${tx.status || '—'}. Usa os campos standard: 1. Sumario Executivo, 2. Dados do Sujeito, 3. Descricao da Actividade Suspeita, 4. Detalhes da Transacao, 5. Evidencias de Suporte, 6. Recomendacao. Responde em portugues de Portugal.`
}

async function fetchAlertById(id) {
  if (!API_BASE) return null
  const res = await fetch(`${API_BASE}/api/alerts/${encodeURIComponent(id)}`)
  if (!res.ok) return null
  return res.json()
}

function mapSystemContext(tx) {
  return {
    source: 'transaction-detail-page',
    transactionId: tx.transaction_id,
    score: Number((Number(tx.anomaly_score ?? 0) * 100).toFixed(2)),
    amount: Number(tx.amount ?? 0),
  }
}

export default function TransactionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = useTransactionData()
  const [transaction, setTransaction] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [sarText, setSarText] = useState('')
  const [sarLoading, setSarLoading] = useState(false)
  const alerts = data?.alerts || []

  useEffect(() => {
    let cancelled = false
    const local = alerts.find((tx) => tx.transaction_id === id)
    if (local) {
      setTransaction(local)
      return
    }
    fetchAlertById(id).then((tx) => {
      if (!cancelled && tx) setTransaction(tx)
    })
    return () => { cancelled = true }
  }, [alerts, id])

  const runAnalysis = useCallback(async () => {
    if (!transaction) return
    setAnalysisLoading(true)
    setAnalysisError('')
    const result = await requestGemini({
      messages: [{ role: 'user', content: txPrompt(transaction) }],
      systemContext: mapSystemContext(transaction),
    })
    if (!result.ok) setAnalysisError(result.error || 'Falha na analise AI.')
    else setAnalysis(result.reply || '(Sem resposta)')
    setAnalysisLoading(false)
  }, [transaction])

  useEffect(() => {
    if (transaction) runAnalysis()
  }, [transaction, runAnalysis])

  const runSar = useCallback(async () => {
    if (!transaction) return
    setSarLoading(true)
    const result = await requestGemini({
      messages: [{ role: 'user', content: sarPrompt(transaction) }],
      systemContext: mapSystemContext(transaction),
    })
    if (result.ok) setSarText(result.reply || '(Sem resposta)')
    else setSarText(result.error || 'Falha ao gerar SAR.')
    setSarLoading(false)
  }, [transaction])

  const scorePct = Number((Number(transaction?.anomaly_score ?? 0) * 100).toFixed(1))
  const showSar = scorePct > 70
  const coords = useMemo(() => {
    const src = COUNTRY_CENTROIDS[(transaction?.source_country || '').toUpperCase()]
    const dst = COUNTRY_CENTROIDS[(transaction?.destination_country || '').toUpperCase()]
    if (!src && !dst) return []
    if (src && dst && src[0] === dst[0] && src[1] === dst[1]) return [src]
    return [src, dst].filter(Boolean)
  }, [transaction])

  if (!transaction) {
    return <div className="py-10 text-sm text-muted-foreground">Transacao nao encontrada.</div>
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar as Transacoes
      </Button>
      <p className="text-xs text-muted-foreground">
        <Link to="/">Overview</Link> {'>'} <Link to="/transactions">Transacoes</Link> {'>'} {transaction.transaction_id}
      </p>

      <Card>
        <CardHeader><CardTitle>Detalhes da Transacao</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>ID</span><span className="font-mono">{transaction.transaction_id}</span></div>
          <div className="flex justify-between"><span>Data</span><span>{transaction.timestamp ? format(new Date(transaction.timestamp), 'PPpp') : '—'}</span></div>
          <div className="flex justify-between"><span>Valor</span><span>€{Number(transaction.amount ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Categoria</span><Badge variant="outline">{transaction.category || '—'}</Badge></div>
          <div className="flex justify-between"><span>Status</span><Badge variant="secondary">{transaction.status || '—'}</Badge></div>
          <div className="flex justify-between"><span>Anomaly score</span><span>{scorePct}%</span></div>
          <div className="flex justify-between gap-4"><span>Conta de Origem</span><span className="font-mono break-all text-right">{transaction.source_account || '—'}</span></div>
          <div className="flex justify-between gap-4"><span>Conta de Destino</span><span className="font-mono break-all text-right">{transaction.destination_account || '—'}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Analise AI</CardTitle>
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analysisLoading}>Reanalisar</Button>
        </CardHeader>
        <CardContent>
          {analysisLoading ? <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />A analisar...</div> : null}
          {!analysisLoading && analysisError ? <p className="text-sm text-destructive">{analysisError}</p> : null}
          {!analysisLoading && !analysisError ? <p className="whitespace-pre-wrap text-sm">{analysis}</p> : null}
        </CardContent>
      </Card>

      {showSar ? (
        <Card>
          <CardHeader>
            <CardTitle>Suspicious Activity Report</CardTitle>
            <p className="text-xs text-muted-foreground">Gera um relatorio SAR preliminar para submissao ao regulador.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runSar} disabled={sarLoading}>{sarLoading ? 'A gerar...' : 'Gerar SAR com AI'}</Button>
            {sarText ? (
              <>
                <pre className="max-h-96 overflow-auto rounded border bg-muted p-3 text-xs whitespace-pre-wrap">{sarText}</pre>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(sarText)}>Copiar para Area de Transferencia</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const blob = new Blob([sarText], { type: 'text/plain;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `sar-${transaction.transaction_id}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>Exportar como TXT</Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Alert Map</CardTitle></CardHeader>
        <CardContent>
          {coords.length > 0 ? (
            <div className="h-[280px] overflow-hidden rounded-lg">
              <MapContainer center={coords[0]} zoom={coords.length > 1 ? 2 : 4} scrollWheelZoom={false} className="h-full w-full" attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {coords.map((pos, idx) => (
                  <Marker key={`${pos.join('-')}-${idx}`} position={pos} icon={L.divIcon({ className: 'map-pin', html: '<span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:#ef4444;border:2px solid white;"></span>' })} />
                ))}
              </MapContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground">Sem coordenadas de origem/destino para esta transacao.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
