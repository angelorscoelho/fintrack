/**
 * Vite build-time loader for shared/thresholds.json.
 *
 * Used in vite.config.js `define` to inline threshold constants
 * at build time — zero runtime cost, tree-shakeable.
 *
 * Usage in vite.config.js:
 *   const thresholds = require('../shared/loadThresholds.cjs')
 *   define: { ...thresholds }
 */
const fs = require('fs')
const path = require('path')

const raw = fs.readFileSync(
  path.resolve(__dirname, 'thresholds.json'),
  'utf-8'
)
const data = JSON.parse(raw)

// Flatten into VITE-style global constants that Vite's `define` can inline.
// Each key becomes a global constant replaced at build time.
module.exports = {
  __THRESHOLDS__: JSON.stringify(data),
}
