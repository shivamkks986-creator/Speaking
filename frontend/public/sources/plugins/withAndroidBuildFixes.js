/**
 * withAndroidBuildFixes — Expo config plugin
 *
 * Applies two PERSISTENT fixes after `expo prebuild` so local Android builds
 * (especially via Android Studio) don't crash with OutOfMemoryError on Windows:
 *
 *   1) android/gradle.properties — append JVM memory flags (Metaspace + heap)
 *   2) android/app/build.gradle  — inject `lint { ... }` block so the slow
 *      lintVitalAnalyzeRelease task is skipped (this is what OOMs the user).
 *
 * Without this plugin, every `expo prebuild --clean` wipes these tweaks and
 * the user has to remember to re-apply them manually — which they don't.
 */
const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/* ---------------- gradle.properties ---------------- */

const PROPS = [
  // 4 GB heap + 1 GB Metaspace — enough for Android Studio Gradle daemon on 8GB machines.
  { type: 'property', key: 'org.gradle.jvmargs',  value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8' },
  { type: 'property', key: 'org.gradle.daemon',   value: 'false' },
  { type: 'property', key: 'org.gradle.parallel', value: 'false' },
  { type: 'property', key: 'kotlin.incremental',  value: 'false' },
];

function withGradleMemoryFix(config) {
  return withGradleProperties(config, (cfg) => {
    PROPS.forEach((p) => {
      const i = cfg.modResults.findIndex(
        (item) => item.type === 'property' && item.key === p.key,
      );
      if (i >= 0) cfg.modResults[i] = p; // overwrite
      else cfg.modResults.push(p);
    });
    return cfg;
  });
}

/* ---------------- app/build.gradle ---------------- */
// Insert a `lint { ... }` block right after `android {` opening brace so the
// slow + memory-hungry lintVitalAnalyzeRelease task is disabled.

const LINT_BLOCK = `
    lint {
        abortOnError false
        checkReleaseBuilds false
        disable 'NewerVersionAvailable', 'GradleDependency', 'InvalidPackage'
    }
`;

function withAppBuildGradleLintDisabled(config) {
  return withAppBuildGradle(config, (cfg) => {
    const c = cfg.modResults.contents;
    if (c.includes('lint {') || c.includes('lintOptions {')) {
      // already has a lint block — leave it alone
      return cfg;
    }
    // Inject right after the first `android {` opening line.
    cfg.modResults.contents = c.replace(/(android\s*\{\s*\n)/, `$1${LINT_BLOCK}`);
    return cfg;
  });
}

/* ---------------- export composed plugin ---------------- */

module.exports = function withAndroidBuildFixes(config) {
  config = withGradleMemoryFix(config);
  config = withAppBuildGradleLintDisabled(config);
  return config;
};
