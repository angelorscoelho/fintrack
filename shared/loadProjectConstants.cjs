/**
 * Vite build-time loader for shared/project_constants.json.
 *
 * Used in vite.config.js `define` to inline project constants
 * at build time — zero runtime cost, tree-shakeable.
 *
 * Usage in vite.config.js:
 *   const constants = require('../shared/loadProjectConstants.cjs')
 *   define: { ...constants }
 */
const fs = require('fs')
const path = require('path')

const raw = fs.readFileSync(
  path.resolve(__dirname, 'project_constants.json'),
  'utf-8'
)
const data = JSON.parse(raw)

// Flatten into VITE-style global constants that Vite's `define` can inline.
// Each key becomes a global constant replaced at build time.
module.exports = {
  __THRESHOLDS__: JSON.stringify(data),
}
