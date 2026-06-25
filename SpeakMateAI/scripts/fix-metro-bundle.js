#!/usr/bin/env node
/**
 * fix-metro-bundle.js
 *
 * Patches node_modules/@expo/metro/metro/shared/output/bundle.js to be RESILIENT
 * to the `metro/private/*` subpath export resolution. On some Windows + Node.js
 * combinations, `require('metro/private/shared/output/bundle')` returns undefined
 * even though the subpath export `./private/* -> ./src/*.js` is declared.
 *
 * Result: `_bundle().default.save(...)` in @expo/cli's exportEmbedAsync throws
 * "Cannot read properties of undefined (reading 'save')" — failing the
 * createBundleReleaseJsAndAssets Gradle task and breaking release builds /
 * Play Store AABs.
 *
 * This script overwrites the shim with a try/catch fallback that requires
 * `metro/src/shared/output/bundle` directly when the subpath export resolution
 * fails. It runs on every `yarn install` via the package.json postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const PATCHES = [
  // (@expo/metro shim at the top-level location used by @expo/cli)
  'node_modules/@expo/metro/metro/shared/output/bundle.js',
  // Nested copies pulled in by transitive dependencies
  'node_modules/@expo/cli/node_modules/@expo/metro-config/node_modules/@expo/metro/metro/shared/output/bundle.js',
];

const PATCHED_CONTENT = `// Patched by scripts/fix-metro-bundle.js — falls back to direct src/ path
// when Node.js subpath exports for 'metro/private/*' don't resolve (Windows quirk).
let mod;
try {
  mod = require('metro/private/shared/output/bundle');
} catch (e) {
  // ignore — try src/ directly below
}
if (!mod) {
  try {
    mod = require('metro/src/shared/output/bundle');
  } catch (e) {
    // last-ditch: try resolving through the parent @expo/metro's own metro
    try {
      mod = require('../../node_modules/metro/src/shared/output/bundle');
    } catch (_) {
      throw e;
    }
  }
}
module.exports = mod;
`;

let patchedCount = 0;
for (const rel of PATCHES) {
  const abs = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(abs)) {
    // not all nested copies exist on every install — that's fine
    continue;
  }
  try {
    const current = fs.readFileSync(abs, 'utf8');
    if (current.includes('Patched by scripts/fix-metro-bundle.js')) {
      // already patched
      continue;
    }
    fs.writeFileSync(abs, PATCHED_CONTENT, 'utf8');
    patchedCount += 1;
    console.log('[fix-metro-bundle] patched', rel);
  } catch (e) {
    console.warn('[fix-metro-bundle] could not patch', rel, '-', e.message);
  }
}

if (patchedCount > 0) {
  console.log('[fix-metro-bundle] done. Patched', patchedCount, 'file(s).');
} else {
  console.log('[fix-metro-bundle] no changes needed (already patched or files not found).');
}
