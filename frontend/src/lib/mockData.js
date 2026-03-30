/**
 * Mock data for FinTrack AI dashboard — used as fallback when the API is unreachable.
 * ~20k records: industry-scale confirmed-fraud rate (pinned rows), lognormal NORMAL scores,
 * IBAN routing fields, and stats aligned with GET /api/stats (including last_24h, fraud_rate).
 */

import { XAI_THRESHOLD, SAR_THRESHOLD } from '@/lib/constants'

const CATEGORIES = ['retail', 'online', 'restaurant', 'gas_station', 'supermarket', 'electronics', 'travel', 'pharmacy']
const COUNTRIES = ['PT', 'ES', 'FR', 'DE', 'IT', 'GB', 'US', 'BR']
const NIF_PREFIXES = ['PT', 'ES', 'FR', 'DE', 'IT']
const IP_PREFIXES = ['185.15.', '91.22.', '78.34.', '186.20.', '201.45.', '54.23.']

const PAYMENT_POOL = [
  ...Array(80).fill('bank_transfer'),
  ...Array(5).fill('mastercard'),
  ...Array(5).fill('visa'),
  ...Array(2).fill('paypal'),
  ...Array(2).fill('mbway'),
  ...Array(3).fill('revolut'),
  ...Array(3).fill('cash'),
]

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}

function randRange(min, max) {
  return min + rand() * (max - min)
}

function randInt(min, max) {
  return Math.floor(randRange(min, max + 1))
}

function digits(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += String(randInt(0, 9))
  return s
}

function formatIbanPT() {
  const body = digits(21)
  const groups = [body.slice(0, 4), body.slice(4, 8), body.slice(8, 12), body.slice(12, 16), body.slice(16, 20), body.slice(20, 21)]
  return `PT50 ${groups.join(' ')}`
}

function formatIbanES() {
  const body = digits(20)
  return `ES91 ${body.match(/.{1,4}/g).join(' ')}`
}

function formatIbanFR() {
  const body = digits(23)
  const g = [body.slice(0, 4), body.slice(4, 8), body.slice(8, 12), body.slice(12, 16), body.slice(16, 20), body.slice(20, 23)]
  return `FR76 ${g.join(' ')}`
}

function formatIbanDE() {
  const body = digits(18)
  return `DE39 ${body.slice(0, 4)} ${body.slice(4, 8)} ${body.slice(8, 12)} ${body.slice(12, 16)} ${body.slice(16, 18)}`
}

function formatIbanGB() {
  const body = digits(18)
  return `GB33 BUKB ${body.slice(0, 4)} ${body.slice(4, 8)} ${body.slice(8, 12)} ${body.slice(12, 16)}${body.slice(16, 18)}`
}

function formatIbanUS() {
  return `US62 ${Array.from({ length: 6 }, () => digits(4)).join(' ')}`
}

function formatIbanCN() {
  return `CN54 ${Array.from({ length: 6 }, () => digits(4)).join(' ')}`
}

const IBAN_BY_CC = {
  PT: formatIbanPT,
  ES: formatIbanES,
  FR: formatIbanFR,
  DE: formatIbanDE,
  GB: formatIbanGB,
  US: formatIbanUS,
  CN: formatIbanCN,
}

function ibanForCountry(cc) {
  const fn = IBAN_BY_CC[cc] || formatIbanPT
  return fn()
}

function pickDestinationCountry() {
  const r = rand()
  if (r < 0.75) return 'PT'
  if (r < 0.8) return 'ES'
  if (r < 0.85) return 'FR'
  if (r < 0.9) return 'DE'
  if (r < 0.933333) return 'US'
  if (r < 0.966666) return 'GB'
  return 'CN'
}

function attachBanking(merchantCountry, obj) {
  const src = merchantCountry || 'PT'
  obj.source_country = src
  const dst = pickDestinationCountry()
  obj.destination_country = dst
  obj.source_account = ibanForCountry(src)
  obj.destination_account = ibanForCountry(dst)
  obj.payment_platform = pick(PAYMENT_POOL)
  obj.merchant_country = src
}

function boxMuller() {
  let u1 = rand()
  while (u1 < 1e-10) u1 = rand()
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function lognormalScore() {
  const mu = -4.5
  const sigma = 0.7
  const raw = Math.exp(mu + sigma * boxMuller())
  return Math.round(Math.max(0.001, Math.min(raw, 0.35)) * 1000) / 1000
}

function getHourlyTargets() {
  // 24h distribution with natural troughs at night and peaks morning/evening.
  return [650, 620, 600, 600, 610, 640, 730, 860, 990, 1020, 1020, 950, 890, 850, 810, 870, 940, 990, 1040, 1000, 940, 860, 790, 730]
}

function generateMockAlerts(count = 20000) {
  const now = Date.now()
  const dayStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '')
  const alerts = []
  const hourlyTargets = getHourlyTargets()
  const criticalCount = 3
  const suspiciousCount = 42
  let globalIndex = 0
  for (let h = 0; h < hourlyTargets.length; h++) {
    const bucketCount = hourlyTargets[h]
    const bucketStart = new Date(now - (23 - h) * 3600 * 1000)
    bucketStart.setMinutes(0, 0, 0)

    for (let j = 0; j < bucketCount; j++) {
      const ts = new Date(bucketStart.getTime() + randInt(0, 59) * 60000 + randInt(0, 59) * 1000)
      const category = pick(CATEGORIES)

      const baseAmounts = {
        retail: [10, 500],
        online: [5, 300],
        restaurant: [10, 150],
        gas_station: [20, 100],
        supermarket: [15, 200],
        electronics: [50, 2000],
        travel: [100, 3000],
        pharmacy: [5, 100],
      }
      const [amin, amax] = baseAmounts[category] || [10, 500]
      const amount = Math.round(randRange(amin, amax) * 100) / 100

      const nifPrefix = pick(NIF_PREFIXES)
      const nifNumber = randInt(100000000, 999999999)
      const merchantNif = `${nifPrefix}${nifNumber}`

      const ip = `${pick(IP_PREFIXES)}${randInt(1, 255)}.${randInt(1, 255)}`

      let anomalyScore
      let status
      let resolution_type = null

      if (globalIndex < criticalCount) {
        anomalyScore = Math.round(randRange(SAR_THRESHOLD, 0.97) * 1000) / 1000
        status = 'PENDING_REVIEW'
      } else if (globalIndex < criticalCount + suspiciousCount) {
        anomalyScore = Math.round(randRange(XAI_THRESHOLD, SAR_THRESHOLD - 0.005) * 1000) / 1000
        status = 'PENDING_REVIEW'
      } else {
        anomalyScore = lognormalScore()
        status = 'NORMAL'
      }

      const sarDraft =
        anomalyScore >= XAI_THRESHOLD
          ? `# Relatório de Atividade Suspeita\n\n**Transação:** MOCK-${dayStr}-${String(globalIndex).padStart(6, '0')}\n**Merchant NIF:** ${merchantNif}\n**Score:** ${(anomalyScore * 100).toFixed(1)}%\n**Montante:** €${amount.toFixed(2)}\n\n## Análise\nTransação com score de anomalia elevado detectada pelo modelo de ML. Requer análise manual.`
          : null

      const aiExplanation =
        anomalyScore >= XAI_THRESHOLD
          ? {
              risk_level: anomalyScore > SAR_THRESHOLD ? 'CRÍTICO' : 'ALTO',
              summary_pt: `Transação de €${amount.toFixed(2)} com score ${(anomalyScore * 100).toFixed(1)}% — padrão anómalo detectado.`,
              bullets: [
                { id: '1', icon: '⚡', text: 'Montante acima da média do merchant' },
                { id: '2', icon: '🌍', text: 'País de origem incomum' },
                { id: '3', icon: '🕐', text: 'Horário fora do padrão habitual' },
              ],
            }
          : null

      const row = {
        transaction_id: `MOCK-${dayStr}-${String(globalIndex).padStart(6, '0')}`,
        amount,
        merchant_nif: merchantNif,
        merchant_name: null,
        category,
        timestamp: ts.toISOString(),
        ip_address: ip,
        merchant_country: pick(COUNTRIES),
        previous_avg_amount: Math.round(randRange(50, 500) * 100) / 100,
        hour_of_day: ts.getHours(),
        day_of_week: ts.getDay(),
        transactions_last_10min: randInt(0, 10),
        anomaly_score: anomalyScore,
        status,
        processed_at: new Date(ts.getTime() + randInt(1, 30) * 1000).toISOString(),
        resolved_at: ['RESOLVED', 'FALSE_POSITIVE'].includes(status)
          ? new Date(ts.getTime() + 3600000).toISOString()
          : null,
        resolution_type,
        analyst_notes: null,
        ai_explanation: aiExplanation,
        sar_draft: sarDraft,
      }

      attachBanking(row.merchant_country, row)
      alerts.push(row)
      globalIndex += 1
    }
  }

  return alerts.slice(0, count)
}

export const MOCK_ALERTS = generateMockAlerts(20000)

export const MOCK_STATS = (() => {
  const now = Date.now()
  const cutoff = now - 86400 * 1000
  const total = MOCK_ALERTS.length
  const last24h = MOCK_ALERTS.filter((a) => new Date(a.timestamp).getTime() >= cutoff).length
  const pending = MOCK_ALERTS.filter((a) => a.status === 'PENDING_REVIEW').length
  const fraud_rate = 0.00015 // 0.015%
  const critical = Math.ceil(fraud_rate * total)
  const resolved = MOCK_ALERTS.filter((a) => a.status === 'RESOLVED').length
  const falsePositives = MOCK_ALERTS.filter((a) => a.status === 'FALSE_POSITIVE').length
  const rateLimited = 0
  const fpRate = resolved + falsePositives > 0 ? falsePositives / (resolved + falsePositives) : 0
  const avgScore = total > 0 ? MOCK_ALERTS.reduce((s, a) => s + Number(a.anomaly_score), 0) / total : 0
  const confirmed_fraud = Math.ceil(fraud_rate * total)

  return {
    total,
    last_24h: last24h,
    pending,
    critical,
    resolved,
    false_positives: falsePositives,
    rate_limited: rateLimited,
    confirmed_fraud,
    fp_rate: Math.round(fpRate * 1000) / 1000,
    avg_score: Math.round(avgScore * 1000) / 1000,
    fraud_rate,
    rate_limits: {},
  }
})()
