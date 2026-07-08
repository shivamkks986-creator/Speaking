/**
 * withAndroidBuildFixes — Expo config plugin
 *
 * Applies PERSISTENT fixes after `expo prebuild` so local Android builds
 * (especially via Android Studio) don't crash and UI overlap issues never
 * recur on curved-edge / punch-hole camera devices.
 *
 *   1) android/gradle.properties — append JVM memory flags (Metaspace + heap)
 *   2) android/app/build.gradle   — inject `lint { ... }` block so the slow
 *      lintVitalAnalyzeRelease task is skipped
 *   3) android/app/src/main/res/values/styles.xml — set the app theme's
 *      windowLayoutInDisplayCutoutMode = "never" and disable status-bar
 *      translucency. This is the NUCLEAR native-side guarantee that no
 *      content can be drawn under the punch-hole camera or curved edges —
 *      regardless of what JS-side padding is applied.
 */
const {
  withGradleProperties,
  withAppBuildGradle,
  withAndroidStyles,
} = require('@expo/config-plugins');

/* ---------------- gradle.properties ---------------- */
const PROPS = [
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
      if (i >= 0) cfg.modResults[i] = p;
      else cfg.modResults.push(p);
    });
    return cfg;
  });
}

/* ---------------- app/build.gradle (lint disable) ---------------- */
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
    if (c.includes('lint {') || c.includes('lintOptions {')) return cfg;
    cfg.modResults.contents = c.replace(/(android\s*\{\s*\n)/, `$1${LINT_BLOCK}`);
    return cfg;
  });
}

/* ---------------- styles.xml (UNIVERSAL cutout fix) ---------------- */
/**
 * Sets three theme attributes on the AppTheme:
 *   - windowLayoutInDisplayCutoutMode = "never"
 *       Android will NEVER draw content behind display cutouts. On
 *       punch-hole / notch devices this creates a black strip around
 *       the cutout, guaranteeing no visual overlap on ANY device.
 *   - windowTranslucentStatus = "false"
 *       Status bar is opaque, content is pushed below it by the OS.
 *   - windowTranslucentNavigation = "false"
 *       Navigation bar is opaque too so bottom content isn't hidden.
 */
function withUniversalSafeAreaStyle(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults;
    const items = styles.resources.style;
    for (const style of items) {
      // AppTheme is the main app theme applied to the Activity
      if (style.$.name === 'AppTheme') {
        const setAttr = (name, value) => {
          const existing = (style.item || []).find((it) => it.$.name === name);
          if (existing) {
            existing._ = value;
          } else {
            style.item = style.item || [];
            style.item.push({ _: value, $: { name } });
          }
        };
        setAttr('android:windowLayoutInDisplayCutoutMode', 'never');
        setAttr('android:windowTranslucentStatus', 'false');
        setAttr('android:windowTranslucentNavigation', 'false');
      }
    }
    return cfg;
  });
}

/* ---------------- export composed plugin ---------------- */
module.exports = function withAndroidBuildFixes(config) {
  config = withGradleMemoryFix(config);
  config = withAppBuildGradleLintDisabled(config);
  config = withUniversalSafeAreaStyle(config);
  return config;
};
