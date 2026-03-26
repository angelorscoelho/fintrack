/**
 * Shared project constants — single source of truth for the frontend.
 *
 * Values are injected at build time by Vite's `define` from shared/project_constants.json.
 * This module re-exports them as named constants for tree-shaking & IDE support.
 *
 * Usage:
 *   import { THRESHOLDS, classifyRisk, getScoreVariant } from '@/lib/constants'
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

// ── API config re-exports ────────────────────────────────────────────────────
export const API_MAX_LIMIT = THRESHOLDS.api.pagination.max_limit

// ── Color maps (CSS classes keyed by risk level) ─────────────────────────────
// These map risk level keys to Tailwind classes. The *thresholds* that determine
// which level a score falls into come from shared/project_constants.json; the *colors*
// are a UI concern that lives here.

const SCORE_BADGE_BG = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  HIGH:     'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  MEDIUM:   'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  LOW:      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

/**
 * Get CSS classes for a score badge background.
 * @param {number} score
 * @returns {string} Tailwind CSS classes
 */
export function getScoreBadgeBg(score) {
  return SCORE_BADGE_BG[classifyRisk(score)] || SCORE_BADGE_BG.LOW
}

const SCORE_RING_COLORS = {
  CRITICAL: { text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  HIGH:     { text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  MEDIUM:   { text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
  LOW:      { text: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
}

/**
 * Get CSS classes for ScoreRing display.
 * @param {number} score
 * @returns {{ text: string, bg: string }}
 */
export function getScoreRingColors(score) {
  return SCORE_RING_COLORS[classifyRisk(score)] || SCORE_RING_COLORS.LOW
}

const GEO_MAP_COLORS = {
  CRITICAL: '#ef4444',  // red-500
  HIGH:     '#f59e0b',  // amber-500
  MEDIUM:   '#64748b',  // slate-500
  LOW:      '#64748b',  // slate-500
}

/**
 * Get hex color for geo map markers.
 * @param {number} score
 * @returns {string} Hex color
 */
export function getGeoMapColor(score) {
  return GEO_MAP_COLORS[classifyRisk(score)] || GEO_MAP_COLORS.LOW
}

const MERCHANT_RISK_LEVELS = {
  CRITICAL: { label: 'CRITICAL', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  HIGH:     { label: 'HIGH',     color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' },
  MEDIUM:   { label: 'MEDIUM',   color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  LOW:      { label: 'LOW',      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' },
}

/**
 * Get merchant risk level label and color classes.
 * @param {number} avgScore
 * @returns {{ label: string, color: string }}
 */
export function getMerchantRiskLevel(avgScore) {
  return MERCHANT_RISK_LEVELS[classifyRisk(avgScore)] || MERCHANT_RISK_LEVELS.LOW
}
