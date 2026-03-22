import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Globe, AlertTriangle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Country-code → approximate centroid coordinates.
 * Covers the country codes used by the data generator (COUNTRY_WEIGHTS).
 */
const COUNTRY_COORDS = {
  PT: { lat: 39.4, lon: -8.2, name: 'Portugal' },
  ES: { lat: 40.5, lon: -3.7, name: 'Espanha' },
  FR: { lat: 46.6, lon: 2.2, name: 'França' },
  DE: { lat: 51.2, lon: 10.4, name: 'Alemanha' },
  GB: { lat: 55.4, lon: -3.4, name: 'Reino Unido' },
  US: { lat: 37.1, lon: -95.7, name: 'Estados Unidos' },
  CN: { lat: 35.9, lon: 104.2, name: 'China' },
  BR: { lat: -14.2, lon: -51.9, name: 'Brasil' },
}

/* Circle marker sizing: base radius + count scaling, capped at max */
const MARKER_RADIUS_BASE = 6
const MARKER_RADIUS_PER_ALERT = 1.2
const MARKER_RADIUS_MAX = 30

/** Colour ramp based on average anomaly score for the cluster. */
function scoreColor(avgScore) {
  if (avgScore > 0.90) return '#ef4444' // red-500  — critical
  if (avgScore >= 0.70) return '#f59e0b' // amber-500 — warning
  return '#64748b' // slate-500 — normal
}

/**
 * Group alert list by merchant_country and compute per-country stats.
 * Returns an array of { code, lat, lon, name, count, avgScore }.
 */
function groupByCountry(items) {
  const acc = {}

  for (const item of items) {
    // Skip alerts whose country code isn't in our centroid lookup
    // (e.g. the generator's "OTHER" bucket has no meaningful coordinates)
    const code = (item.merchant_country || '').toUpperCase()
    if (!code || !COUNTRY_COORDS[code]) continue

    if (!acc[code]) {
      acc[code] = { totalScore: 0, count: 0 }
    }
    acc[code].count += 1
    acc[code].totalScore += Number(item.anomaly_score || 0)
  }

  return Object.entries(acc).map(([code, { totalScore, count }]) => {
    const coords = COUNTRY_COORDS[code]
    return {
      code,
      lat: coords.lat,
      lon: coords.lon,
      name: coords.name,
      count,
      avgScore: count > 0 ? totalScore / count : 0,
    }
  })
}

export function GeoMap() {
  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['geo-alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/alerts?limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const clusters = useMemo(() => {
    const items = rawData?.items || []
    return groupByCountry(items)
  }, [rawData])

  const hasData = clusters.length > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Mapa de Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[280px] rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">A carregar mapa...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">Erro ao carregar dados. Tente novamente.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            Sem dados geográficos disponíveis
          </div>
        ) : (
          <div className="h-[280px] rounded-lg overflow-hidden">
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
              {clusters.map((c) => (
                <CircleMarker
                  key={c.code}
                  center={[c.lat, c.lon]}
                  radius={Math.min(MARKER_RADIUS_BASE + c.count * MARKER_RADIUS_PER_ALERT, MARKER_RADIUS_MAX)}
                  pathOptions={{
                    color: scoreColor(c.avgScore),
                    fillColor: scoreColor(c.avgScore),
                    fillOpacity: 0.55,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" opacity={0.95}>
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold">{c.name} ({c.code})</p>
                      <p>Alertas: <span className="font-medium">{c.count}</span></p>
                      <p>Score médio: <span className="font-medium">{(c.avgScore * 100).toFixed(1)}%</span></p>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
