/**
 * Mock data for FinTrack AI dashboard — used as fallback when the API is unreachable.
 * Data mirrors the structure produced by backend/api/scripts/seed_dynamodb.py.
 *
 * Score thresholds are sourced from shared/project_constants.json via Vite build-time
 * injection (XAI_THRESHOLD = 0.70, SAR_THRESHOLD = 0.90).
 *
 * Distribution (realistic fraud rate ≤3%, lognormal scores):
 *   - 2  CONFIRMED_FRAUD  (RESOLVED, score 0.82–0.97)  → fraud_rate ≈ 2.5%
 *   - 4  PENDING_REVIEW   score > SAR_THRESHOLD  (critical)
 *   - 8  PENDING_REVIEW   score XAI_THRESHOLD–SAR_THRESHOLD  (high)
 *   - 2  FALSE_POSITIVE   (resolved, score XAI_THRESHOLD–0.82)
 *   - 64 NORMAL           lognormal scores (median ≈ 0.02)
 *
 * Targets: avg_score 10–18 %, fraud_rate 1.5–3.5 %
 */

import { XAI_THRESHOLD, SAR_THRESHOLD } from '@/lib/constants'

const CATEGORIES = ['retail', 'online', 'restaurant', 'gas_station', 'supermarket', 'electronics', 'travel', 'pharmacy']
const COUNTRIES = ['PT', 'ES', 'FR', 'DE', 'IT', 'GB', 'US', 'BR']
const NIF_PREFIXES = ['PT', 'ES', 'FR', 'DE', 'IT']
const IP_PREFIXES = ['185.15.', '91.22.', '78.34.', '186.20.', '201.45.', '54.23.']

/* ── Deterministic pseudo-random number generator (mulberry32) ──────────── */
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

/* ── Box-Muller transform → standard normal variate ─────────────────────── */
function boxMuller() {
  let u1 = rand()
  // Regenerate if u1 is too close to 0 to avoid log(0) instability
  while (u1 < 1e-10) u1 = rand()
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/* ── Lognormal score for NORMAL transactions (clipped to [0.001, 0.35]) ──
 * Parameters chosen to match real-world fraud-score distributions:
 *   mu = -4.5 → median ≈ exp(-4.5) ≈ 0.011  (most scores near 1 %)
 *   sigma = 0.7 → moderate right-skew so a few scores reach 5–15 %
 * Combined with 16 flagged transactions, this yields avg_score ≈ 14–18 %.
 */
function lognormalScore() {
  const mu = -4.5   // median ≈ exp(−4.5) ≈ 0.011
  const sigma = 0.7  // moderate spread
  const raw = Math.exp(mu + sigma * boxMuller())
  return Math.round(Math.max(0.001, Math.min(raw, 0.35)) * 1000) / 1000
}

function generateMockAlerts(count = 80) {
  const now = Date.now()
  const alerts = []

  /* ── Controlled slot assignment ─────────────────────────────────────────
   * Guarantees exact counts that satisfy the acceptance criteria.
   */
  const slots = []
  const addN = (type, n) => { for (let k = 0; k < n; k++) slots.push(type) }
  addN('CONFIRMED_FRAUD', 2)   // 2/80 = 2.5 %  (fraud_rate)
  addN('CRITICAL_PENDING', 4)  // PENDING_REVIEW, score > 0.90
  addN('HIGH_PENDING', 8)      // PENDING_REVIEW, score 0.70–0.90
  addN('FALSE_POSITIVE', 2)    // resolved as FP, score 0.70–0.82
  addN('NORMAL', count - slots.length) // 64 normal (lognormal scores)

  // Fisher-Yates shuffle with deterministic PRNG
  for (let k = slots.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1))
    ;[slots[k], slots[j]] = [slots[j], slots[k]]
  }

  /* ── Generate transactions ──────────────────────────────────────────── */
  for (let i = 0; i < count; i++) {
    const hoursAgo = randRange(0, 24)
    const ts = new Date(now - hoursAgo * 3600 * 1000)
    const category = pick(CATEGORIES)

    const baseAmounts = {
      retail: [10, 500], online: [5, 300], restaurant: [10, 150],
      gas_station: [20, 100], supermarket: [15, 200], electronics: [50, 2000],
      travel: [100, 3000], pharmacy: [5, 100],
    }
    const [amin, amax] = baseAmounts[category] || [10, 500]
    const amount = Math.round(randRange(amin, amax) * 100) / 100

    const nifPrefix = pick(NIF_PREFIXES)
    const nifNumber = randInt(100000000, 999999999)
    const merchantNif = `${nifPrefix}${nifNumber}`

    const ip = `${pick(IP_PREFIXES)}${randInt(1, 255)}.${randInt(1, 255)}`

    /* ── Score & status by slot type ──────────────────────────────────── */
    let anomalyScore, status, resolutionType = null
    const slot = slots[i]

    switch (slot) {
      case 'NORMAL':
        anomalyScore = lognormalScore()
        status = 'NORMAL'
        break
      case 'HIGH_PENDING':
        anomalyScore = Math.round(randRange(XAI_THRESHOLD, SAR_THRESHOLD) * 1000) / 1000
        status = 'PENDING_REVIEW'
        break
      case 'CRITICAL_PENDING':
        anomalyScore = Math.round(randRange(SAR_THRESHOLD, 0.995) * 1000) / 1000
        status = 'PENDING_REVIEW'
        break
      case 'CONFIRMED_FRAUD':
        anomalyScore = Math.round(randRange(0.82, 0.97) * 1000) / 1000
        status = 'RESOLVED'
        resolutionType = 'CONFIRMED_FRAUD'
        break
      case 'FALSE_POSITIVE':
        anomalyScore = Math.round(randRange(XAI_THRESHOLD, 0.82) * 1000) / 1000
        status = 'FALSE_POSITIVE'
        resolutionType = 'FALSE_POSITIVE'
        break
    }

    const sarDraft = anomalyScore >= XAI_THRESHOLD
      ? `# Relatório de Atividade Suspeita\n\n**Transação:** TXN-${String(i).padStart(6, '0')}\n**Merchant NIF:** ${merchantNif}\n**Score:** ${(anomalyScore * 100).toFixed(1)}%\n**Montante:** €${amount.toFixed(2)}\n\n## Análise\nTransação com score de anomalia elevado detectada pelo modelo de ML. Requer análise manual.`
      : null

    const aiExplanation = anomalyScore >= XAI_THRESHOLD
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

    alerts.push({
      transaction_id: `TXN-${new Date(now).toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(6, '0')}`,
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
      resolved_at: ['RESOLVED', 'FALSE_POSITIVE'].includes(status) ? new Date(ts.getTime() + 3600000).toISOString() : null,
      resolution_type: resolutionType,
      analyst_notes: null,
      ai_explanation: aiExplanation,
      sar_draft: sarDraft,
    })
  }

  return alerts
}

export const MOCK_ALERTS = generateMockAlerts(80)

export const MOCK_STATS = (() => {
  const now = Date.now()
  const cutoff = now - 86400 * 1000
  const total = MOCK_ALERTS.length
  const last24h = MOCK_ALERTS.filter((a) => new Date(a.timestamp).getTime() >= cutoff).length
  const pending = MOCK_ALERTS.filter((a) => a.status === 'PENDING_REVIEW').length
  const critical = MOCK_ALERTS.filter(
    (a) => Number(a.anomaly_score) > SAR_THRESHOLD && a.status === 'PENDING_REVIEW'
  ).length
  const resolved = MOCK_ALERTS.filter((a) => a.status === 'RESOLVED').length
  const falsePositives = MOCK_ALERTS.filter((a) => a.status === 'FALSE_POSITIVE').length
  const rateLimited = 0
  const fpRate = resolved + falsePositives > 0 ? falsePositives / (resolved + falsePositives) : 0
  const avgScore = total > 0 ? MOCK_ALERTS.reduce((s, a) => s + Number(a.anomaly_score), 0) / total : 0

  return {
    total,
    last_24h: last24h,
    pending,
    critical,
    resolved,
    false_positives: falsePositives,
    rate_limited: rateLimited,
    fp_rate: Math.round(fpRate * 1000) / 1000,
    avg_score: Math.round(avgScore * 1000) / 1000,
    rate_limits: {},
  }
})()
