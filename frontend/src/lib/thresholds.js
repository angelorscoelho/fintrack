/**
 * Shared thresholds — single source of truth for the frontend.
 *
 * Values are injected at build time by Vite's `define` from shared/thresholds.json.
 * This module re-exports them as named constants for tree-shaking & IDE support.
 *
 * Usage:
 *   import { THRESHOLDS, classifyRisk, getScoreVariant } from '@/lib/thresholds'
 */

/* global __THRESHOLDS__ */
// eslint-disable-next-line no-undef
export const THRESHOLDS = __THRESHOLDS__

// ── Score thresholds ─────────────────────────────────────────────────────────
export const XAI_THRESHOLD = THRESHOLDS.score.xai          // 0.70
export const SAR_THRESHOLD = THRESHOLDS.score.sar          // 0.90

// ── Risk levels (sorted descending by min for fast classification) ───────────
const RISK_LEVELS = [...THRESHOLDS.risk_levels].sort((a, b) => b.min - a.min)

/**
 * Classify a numeric anomaly score into a risk level key.
 * @param {number} score - Anomaly score (0–1)
 * @returns {string} Risk level key: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 */
export function classifyRisk(score) {
  const s = Number(score || 0)
  for (const level of RISK_LEVELS) {
    if (s >= level.min) return level.key
  }
  return 'LOW'
}

/**
 * Get the shadcn Badge variant for a given score.
 * @param {number} score - Anomaly score (0–1)
 * @returns {string} Badge variant: 'destructive' | 'warning' | 'outline'
 */
export function getScoreVariant(score) {
  const key = classifyRisk(score)
  return THRESHOLDS.ui.score_variant[key] || 'outline'
}

/**
 * Get the risk level metadata for a given score.
 * @param {number} score - Anomaly score (0–1)
 * @returns {{ key: string, label: string, color: string, min: number, max: number }}
 */
export function getRiskLevel(score) {
  const s = Number(score || 0)
  for (const level of RISK_LEVELS) {
    if (s >= level.min) return level
  }
  return RISK_LEVELS[RISK_LEVELS.length - 1]
}

// ── UI config re-exports ─────────────────────────────────────────────────────
export const HISTOGRAM_BUCKETS = THRESHOLDS.ui.histogram_buckets
export const FILTER_OPTIONS = THRESHOLDS.ui.filter_options
export const KPI_THRESHOLDS = THRESHOLDS.ui.kpi_variant
export const BUDGET_THRESHOLDS = THRESHOLDS.budget
