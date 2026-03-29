import { useMemo, useState, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Globe, AlertTriangle } from 'lucide-react'
import { safeFetch } from '@/lib/api'
import { API_MAX_LIMIT, SAR_THRESHOLD, XAI_THRESHOLD } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * ISO 3166-1 alpha-2 → [lat, lng] approximate centroids (WGS84).
 */
const COUNTRY_CENTROIDS = {
  PT: [39.3999, -8.2245],
  ES: [40.4637, -3.7492],
  FR: [46.2276, 2.2137],
  DE: [51.1657, 10.4515],
  GB: [55.3781, -3.436],
  IT: [41.8719, 12.5674],
  NL: [52.1326, 5.2913],
  US: [37.0902, -95.7129],
  CN: [35.8617, 104.1954],
  BR: [-14.235, -51.9253],
}

const RISK_STROKE = {
  critical: { stroke: '#ef4444', opacity: 0.85 },
  suspicious: { stroke: '#f97316', opacity: 0.75 },
  normal: { stroke: '#94a3b8', opacity: 0.35 },
}

const RISK_ANIM_DURATION = {
  critical: '1.2s',
  suspicious: '2.5s',
  normal: '5s',
}

function tierFromScore(score) {
  const s = Number(score)
  if (s >= SAR_THRESHOLD) return 'critical'
  if (s >= XAI_THRESHOLD) return 'suspicious'
  return 'normal'
}

function strokeWidthForAmount(amount) {
  const a = Number(amount)
  if (a <= 100) return 1
  if (a <= 1000) return 2
  return 3
}

function abbreviateTxId(id) {
  if (!id) return '—'
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

/**
 * Quadratic Bézier from p0 to p1 with perpendicular bulge (screen space).
 */
function quadArcPath(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.hypot(dx, dy)
  if (dist < 4) return null
  const nx = -dy / dist
  const ny = dx / dist
  const bulge = dist * 0.22
  const cx = (x0 + x1) / 2 + nx * bulge
  const cy = (y0 + y1) / 2 + ny * bulge
  return { d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`, cx, cy }
}

function quadPointAtMid(x0, y0, cx, cy, x1, y1) {
  const t = 0.5
  const mt = 1 - t
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
  }
}

/**
 * Group transactions by source → destination country pair.
 */
function buildArcGroups(items) {
  const map = new Map()

  for (const item of items) {
    const src = (item.source_country || '').toUpperCase()
    const dst = (item.destination_country || '').toUpperCase()
    if (!src || !dst || src === dst) continue
    if (!COUNTRY_CENTROIDS[src] || !COUNTRY_CENTROIDS[dst]) continue

    const key = `${src}|${dst}`
    if (!map.has(key)) {
      map.set(key, { source: src, dest: dst, txs: [] })
    }
    map.get(key).txs.push(item)
  }

  return Array.from(map.values()).map((g) => {
    const maxScore = Math.max(...g.txs.map((t) => Number(t.anomaly_score ?? 0)))
    const widths = g.txs.map((t) => strokeWidthForAmount(t.amount))
    const strokeW = Math.min(5, Math.max(...widths))
    return {
      ...g,
      count: g.txs.length,
      maxScore,
      strokeW,
      tier: tierFromScore(maxScore),
    }
  })
}

function ArcOverlay({ groups, visibility }) {
  const map = useMap()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [dims, setDims] = useState({ w: 0, h: 0 })

  const syncDims = useCallback(() => {
    map.invalidateSize({ animate: false })
    const el = map.getContainer()
    setDims({ w: el.clientWidth, h: el.clientHeight })
  }, [map])

  useMapEvents({
    moveend: syncDims,
    zoomend: syncDims,
    resize: syncDims,
  })

  useLayoutEffect(() => {
    const el = map.getContainer()
    syncDims()
    const ro = new ResizeObserver(syncDims)
    ro.observe(el)
    return () => ro.disconnect()
  }, [map, syncDims])

  const visibleGroups = useMemo(
    () => groups.filter((g) => visibility[g.tier]),
    [groups, visibility],
  )

  const handleNav = useCallback(
    (source, dest) => {
      navigate(
        `/transactions?sourceCountry=${encodeURIComponent(source)}&destCountry=${encodeURIComponent(dest)}`,
      )
    },
    [navigate],
  )

  const portalTarget = map.getContainer()

  if (!portalTarget || dims.w < 2 || dims.h < 2) return null

  const svgContent = (
    <svg
      width={dims.w}
      height={dims.h}
      className="pointer-events-none absolute left-0 top-0 z-[450] overflow-visible"
      style={{ width: dims.w, height: dims.h }}
      aria-hidden
    >
      {visibleGroups.map((g) => {
        const [lat0, lng0] = COUNTRY_CENTROIDS[g.source]
        const [lat1, lng1] = COUNTRY_CENTROIDS[g.dest]
        const p0 = map.latLngToContainerPoint(L.latLng(lat0, lng0))
        const p1 = map.latLngToContainerPoint(L.latLng(lat1, lng1))
        const arc = quadArcPath(p0.x, p0.y, p1.x, p1.y)
        if (!arc) return null

        const { stroke, opacity } = RISK_STROKE[g.tier]
        const duration = RISK_ANIM_DURATION[g.tier]
        const isGroup = g.count >= 2
        const rep = g.txs.reduce((best, tx) =>
          Number(tx.anomaly_score ?? 0) > Number(best.anomaly_score ?? 0) ? tx : best,
        g.txs[0])

        const pathEl = (
          <path
            d={arc.d}
            fill="none"
            stroke={stroke}
            strokeOpacity={opacity}
            strokeWidth={g.strokeW}
            strokeLinecap="round"
            className="geo-map-arc-path"
            style={{
              strokeDasharray: '8 4',
              animation: `geo-map-dash ${duration} linear infinite`,
            }}
            pointerEvents="stroke"
            onClick={(e) => {
              e.stopPropagation()
              handleNav(g.source, g.dest)
            }}
          />
        )

        const tooltipContent = isGroup ? (
          <p className="max-w-xs text-xs">{t('dashboard.geoMapArcGroupedHint', { count: g.count })}</p>
        ) : (
          <div className="space-y-1 text-xs">
            <p className="font-mono">{abbreviateTxId(rep.transaction_id)}</p>
            <p>
              €{Number(rep.amount).toFixed(2)} · {(Number(rep.anomaly_score) * 100).toFixed(1)}% ·{' '}
              {rep.payment_platform ?? '—'}
            </p>
            <p className="text-muted-foreground">
              {rep.timestamp ? format(new Date(rep.timestamp), 'MMM d, yyyy HH:mm') : '—'}
            </p>
          </div>
        )

        const mid = quadPointAtMid(p0.x, p0.y, arc.cx, arc.cy, p1.x, p1.y)

        return (
          <g key={`${g.source}-${g.dest}`}>
            <Tooltip>
              <TooltipTrigger asChild>{pathEl}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
            {isGroup && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <circle
                    cx={mid.x}
                    cy={mid.y}
                    r={10}
                    fill="hsl(var(--card))"
                    stroke={stroke}
                    strokeOpacity={opacity}
                    strokeWidth={2}
                    className="cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNav(g.source, g.dest)
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-xs text-xs">{t('dashboard.geoMapArcGroupedHint', { count: g.count })}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isGroup && (
              <text
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none text-[11px] font-semibold"
                style={{ pointerEvents: 'none', fill: 'hsl(var(--foreground))' }}
              >
                {g.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )

  return createPortal(svgContent, portalTarget)
}

export function GeoMap() {
  const { t } = useLanguage()
  const [visibility, setVisibility] = useState({
    critical: true,
    suspicious: true,
    normal: true,
  })

  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['geo-alerts'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const arcGroups = useMemo(() => {
    const items = rawData?.items || []
    return buildArcGroups(items)
  }, [rawData])

  const hasData = arcGroups.length > 0

  const chipClass = (active) =>
    cn(
      'h-8 shrink-0 gap-1 rounded-md border px-2.5 text-xs font-medium transition-opacity',
      active
        ? 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
        : 'border-dashed border-muted-foreground/60 bg-transparent text-muted-foreground opacity-50 hover:opacity-70',
    )

  const toggleTier = (tier) => {
    setVisibility((v) => ({ ...v, [tier]: !v[tier] }))
  }

  return (
    <Card>
      <style>{`
        @keyframes geo-map-dash {
          to { stroke-dashoffset: -36; }
        }
      `}</style>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.alertMap')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[280px] rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">{t('dashboard.loadingMap')}</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{t('feedback.errorLoading')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('actions.tryAgain')}
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            {t('dashboard.noGeoData')}
          </div>
        ) : (
          <div className="relative h-[280px] rounded-lg overflow-hidden">
            <TooltipProvider delayDuration={300}>
              <MapContainer
                center={[39.5, -8]}
                zoom={2}
                minZoom={2}
                scrollWheelZoom={false}
                className="h-full w-full z-0"
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                />
                <ArcOverlay groups={arcGroups} visibility={visibility} />
              </MapContainer>
              <div className="pointer-events-none absolute inset-0 z-[500]">
                <div className="pointer-events-auto absolute left-2 top-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={chipClass(visibility.critical)}
                    aria-pressed={visibility.critical}
                    onClick={() => toggleTier('critical')}
                  >
                    {t('dashboard.volumeChipCritical')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={chipClass(visibility.suspicious)}
                    aria-pressed={visibility.suspicious}
                    onClick={() => toggleTier('suspicious')}
                  >
                    {t('dashboard.volumeChipSuspicious')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={chipClass(visibility.normal)}
                    aria-pressed={visibility.normal}
                    onClick={() => toggleTier('normal')}
                  >
                    {t('dashboard.volumeChipNormal')}
                  </Button>
                </div>
              </div>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
