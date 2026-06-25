#!/usr/bin/env node
/**
 * fix-metro-bundle.js (v2 — auto-discovery + .save() validation)
 *
 * Walks node_modules to find EVERY @expo/metro shim at
 * `**​/@expo/metro/metro/shared/output/bundle.js` and patches each so the
 * exported module is GUARANTEED to expose `.save` and `.build` functions.
 *
 * Original shim is a one-liner:
 *     module.exports = require('metro/private/shared/output/bundle');
 * On some Windows + Node combinations the `metro/private/*` subpath export
 * either resolves to undefined or to a partial module that lacks `.save`,
 * breaking `@expo/cli`'s exportEmbedAsync → `:app:createBundleReleaseJsAndAssets`.
 *
 * This patch tries multiple paths in order and returns the first one whose
 * exports include a callable `.save` function. Idempotent via marker comment.
 *
 * Runs automatically as a postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const PATCHED_CONTENT = `// Patched by scripts/fix-metro-bundle.js v2 — guaranteed-save fallback for Windows/Node quirks.
'use strict';
function _try(p) {
  try {
    const m = require(p);
    if (m && typeof m.save === 'function' && typeof m.build === 'function') return m;
    // some envs return module under .default
    if (m && m.default && typeof m.default.save === 'function') return m.default;
  } catch (_) {}
  return null;
}
const mod =
  _try('metro/private/shared/output/bundle') ||
  _try('metro/src/shared/output/bundle') ||
  _try('../../../metro/src/shared/output/bundle') ||
  _try('../../../../metro/src/shared/output/bundle') ||
  _try(require('path').join(__dirname, '..', '..', '..', '..', '..', 'metro', 'src', 'shared', 'output', 'bundle.js'));
if (!mod) {
  throw new Error(
    "[fix-metro-bundle] Could not resolve a working metro/shared/output/bundle. " +
    "Tried multiple paths; none exposed a callable .save() function."
  );
}
module.exports = mod;
`;

const MARKER = 'Patched by scripts/fix-metro-bundle.js v2';

function walkAndCollect(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return results;
  }
  for (const ent of entries) {
    if (ent.name === '.bin' || ent.name === '.cache') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkAndCollect(full, results);
    else if (
      ent.isFile() &&
      ent.name === 'bundle.js' &&
      full.replace(/\\/g, '/').endsWith('/@expo/metro/metro/shared/output/bundle.js')
    ) {
      results.push(full);
    }
  }
  return results;
}

const root = path.resolve(process.cwd(), 'node_modules');
if (!fs.existsSync(root)) {
  console.log('[fix-metro-bundle] node_modules not present yet, skipping.');
  process.exit(0);
}

const targets = walkAndCollect(root);
let patchedCount = 0;
let skippedCount = 0;

for (const file of targets) {
  try {
    const cur = fs.readFileSync(file, 'utf8');
    if (cur.includes(MARKER)) {
      skippedCount += 1;
      continue;
    }
    fs.writeFileSync(file, PATCHED_CONTENT, 'utf8');
    patchedCount += 1;
    console.log('[fix-metro-bundle] patched', path.relative(process.cwd(), file));
  } catch (e) {
    console.warn('[fix-metro-bundle] could not patch', file, '-', e.message);
  }
}

console.log('[fix-metro-bundle] done. patched=' + patchedCount + ', already-patched=' + skippedCount + ', total-shims=' + targets.length);
