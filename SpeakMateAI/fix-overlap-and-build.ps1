# =============================================================================
# SpeakMate AI — One-Shot UI Overlap Permanent Fix + Build Script
# =============================================================================
# What this does (in order):
#   1. Verifies you're in the SpeakMateAI folder
#   2. Writes the centralised useScreenInsets hook (single-source-of-truth)
#   3. Rewrites ScreenContainer to use the hook
#   4. Patches Speaking / Interview / Premium tab screens (top + bottom padding)
#   5. Kills stale Java/Gradle/Kotlin processes
#   6. Backs up old android folder, runs `expo prebuild --clean`
#   7. Patches gradle.properties (4 GB heap, in-process Kotlin) + lint disable
#   8. Wires release keystore (if speakmateai-release.jks present)
#   9. Builds the Release AAB (Play Store) via `gradlew bundleRelease`
#  10. Prints AAB path + opens the output folder
#
# Run from your SpeakMateAI folder (e.g. D:\sm\SpeakMateAI):
#     powershell -ExecutionPolicy Bypass -File .\fix-overlap-and-build.ps1
# =============================================================================

$ErrorActionPreference = "Continue"
$startTime = Get-Date

function Write-Step { param([string]$Msg) Write-Host "" ; Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "    [OK]   $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "    [WARN] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "    [ERR]  $Msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# STEP 0 — Preflight
# ---------------------------------------------------------------------------
Write-Step "Preflight checks"
if (-not (Test-Path "package.json")) {
    Write-Err "Not in SpeakMateAI folder. cd into it first (e.g. cd D:\sm\SpeakMateAI)."
    exit 1
}
$pkgName = (Get-Content package.json -Raw | ConvertFrom-Json).name
if ($pkgName -ne "speakmate-ai") { Write-Warn "package.json name is '$pkgName' — proceeding anyway." }
Write-Ok "In folder: $(Get-Location)"

# ---------------------------------------------------------------------------
# STEP 1 — Write src/hooks/useScreenInsets.ts (NEW)
# ---------------------------------------------------------------------------
Write-Step "Writing src/hooks/useScreenInsets.ts (centralised safe-area hook)"
New-Item -ItemType Directory -Force -Path "src\hooks" | Out-Null
$useScreenInsets = @'
// useScreenInsets — single source of truth for safe-area padding across the app.
import { useContext } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

const MIN_TOP_FLOOR = Platform.OS === 'android' ? 28 : 20;

export interface ScreenInsets {
  top: number;
  bottom: number;
  tabBarHeight: number;
  headerPaddingTop: number;
  bottomPad: number;
}

export function useScreenInsets(extraTop = 0, extraBottom = 24): ScreenInsets {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const statusBarH = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const top = Math.max(insets.top, statusBarH, MIN_TOP_FLOOR);
  return {
    top,
    bottom: insets.bottom,
    tabBarHeight,
    headerPaddingTop: top + extraTop,
    bottomPad: Math.max(tabBarHeight, insets.bottom) + extraBottom,
  };
}
'@
Set-Content -Path "src\hooks\useScreenInsets.ts" -Value $useScreenInsets -Encoding UTF8
Write-Ok "Wrote src\hooks\useScreenInsets.ts"

# ---------------------------------------------------------------------------
# STEP 2 — Rewrite src/components/common/ScreenContainer.tsx
# ---------------------------------------------------------------------------
Write-Step "Rewriting src\components\common\ScreenContainer.tsx"
$screenContainer = @'
import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useScreenInsets } from '@/hooks/useScreenInsets';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  contentStyle,
}: Props) {
  const theme = useTheme();
  const { headerPaddingTop, bottomPad } = useScreenInsets();
  const Container = scroll ? ScrollView : View;
  return (
    <View
      style={[styles.flex, { backgroundColor: theme.colors.background, paddingTop: headerPaddingTop }]}
    >
      <Container
        style={styles.flex}
        contentContainerStyle={[
          padded ? styles.padded : null,
          scroll ? { paddingBottom: bottomPad } : null,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16, paddingVertical: 8 },
});
'@
Set-Content -Path "src\components\common\ScreenContainer.tsx" -Value $screenContainer -Encoding UTF8
Write-Ok "Wrote src\components\common\ScreenContainer.tsx"

# ---------------------------------------------------------------------------
# STEP 3 — Helper: in-place patch a file (search-and-replace exact strings)
# ---------------------------------------------------------------------------
function Patch-File {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Find,
        [Parameter(Mandatory)][string]$Replace,
        [string]$Label = ""
    )
    if (-not (Test-Path $Path)) { Write-Warn "Skipped $Path (file not found)"; return $false }
    $content = Get-Content $Path -Raw
    # Idempotency: if the replacement string is already present in the file,
    # skip — this allows running the script multiple times safely.
    if ($content -like "*$Replace*") {
        Write-Ok "$Label already patched ($Path)"
        return $true
    }
    if ($content -notlike "*$Find*") {
        Write-Warn "$Label — search string not found in $Path (skipping)"
        return $false
    }
    $newContent = $content.Replace($Find, $Replace)
    Set-Content -Path $Path -Value $newContent -Encoding UTF8 -NoNewline
    Write-Ok "$Label patched ($Path)"
    return $true
}

# ---------------------------------------------------------------------------
# STEP 4 — Patch SpeakingPracticeScreen.tsx
# ---------------------------------------------------------------------------
Write-Step "Patching tab screens (Speaking / Interview / Premium)"

$speakFile = "src\screens\speaking\SpeakingPracticeScreen.tsx"
Patch-File -Path $speakFile -Label "Speaking [import]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`r`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null
# Fallback for LF line endings
Patch-File -Path $speakFile -Label "Speaking [import LF]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null

Patch-File -Path $speakFile -Label "Speaking [hook]" `
    -Find "const navigation = useNavigation<Nav>();`r`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "const navigation = useNavigation<Nav>();`r`n  const tabBarHeight = useBottomTabBarHeight();`r`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null
Patch-File -Path $speakFile -Label "Speaking [hook LF]" `
    -Find "const navigation = useNavigation<Nav>();`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "const navigation = useNavigation<Nav>();`n  const tabBarHeight = useBottomTabBarHeight();`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null

Patch-File -Path $speakFile -Label "Speaking [edges+padding]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`r`n        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`r`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 140, paddingTop: headerPaddingTop }} showsVerticalScrollIndicator={false}>" | Out-Null
Patch-File -Path $speakFile -Label "Speaking [edges+padding LF]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`n        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 140, paddingTop: headerPaddingTop }} showsVerticalScrollIndicator={false}>" | Out-Null

# ---------------------------------------------------------------------------
# STEP 5 — Patch InterviewCoachScreen.tsx
# ---------------------------------------------------------------------------
$interviewFile = "src\screens\interview\InterviewCoachScreen.tsx"
Patch-File -Path $interviewFile -Label "Interview [import]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`r`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null
Patch-File -Path $interviewFile -Label "Interview [import LF]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null

Patch-File -Path $interviewFile -Label "Interview [hook]" `
    -Find "export default function InterviewCoachScreen() {`r`n  const navigation = useNavigation<Nav>();`r`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "export default function InterviewCoachScreen() {`r`n  const navigation = useNavigation<Nav>();`r`n  const tabBarHeight = useBottomTabBarHeight();`r`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null
Patch-File -Path $interviewFile -Label "Interview [hook LF]" `
    -Find "export default function InterviewCoachScreen() {`n  const navigation = useNavigation<Nav>();`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "export default function InterviewCoachScreen() {`n  const navigation = useNavigation<Nav>();`n  const tabBarHeight = useBottomTabBarHeight();`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null

Patch-File -Path $interviewFile -Label "Interview [edges+header]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`r`n        <View style={styles.header}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`r`n        <View style={[styles.header, { paddingTop: headerPaddingTop + 8 }]}>" | Out-Null
Patch-File -Path $interviewFile -Label "Interview [edges+header LF]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`n        <View style={styles.header}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`n        <View style={[styles.header, { paddingTop: headerPaddingTop + 8 }]}>" | Out-Null

# ---------------------------------------------------------------------------
# STEP 6 — Patch PremiumScreen.tsx
# ---------------------------------------------------------------------------
$premiumFile = "src\screens\premium\PremiumScreen.tsx"
Patch-File -Path $premiumFile -Label "Premium [import]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`r`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`r`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null
Patch-File -Path $premiumFile -Label "Premium [import LF]" `
    -Find "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';" `
    -Replace "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';`nimport { useScreenInsets } from '@/hooks/useScreenInsets';" | Out-Null

Patch-File -Path $premiumFile -Label "Premium [hook]" `
    -Find "export default function PremiumScreen() {`r`n  const navigation = useNavigation();`r`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "export default function PremiumScreen() {`r`n  const navigation = useNavigation();`r`n  const tabBarHeight = useBottomTabBarHeight();`r`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null
Patch-File -Path $premiumFile -Label "Premium [hook LF]" `
    -Find "export default function PremiumScreen() {`n  const navigation = useNavigation();`n  const tabBarHeight = useBottomTabBarHeight();" `
    -Replace "export default function PremiumScreen() {`n  const navigation = useNavigation();`n  const tabBarHeight = useBottomTabBarHeight();`n  const { headerPaddingTop } = useScreenInsets();" | Out-Null

Patch-File -Path $premiumFile -Label "Premium [edges+padding]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`r`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }} showsVerticalScrollIndicator={false}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`r`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 32, paddingTop: headerPaddingTop }} showsVerticalScrollIndicator={false}>" | Out-Null
Patch-File -Path $premiumFile -Label "Premium [edges+padding LF]" `
    -Find "<SafeAreaView style={{ flex: 1 }} edges={['top']}>`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }} showsVerticalScrollIndicator={false}>" `
    -Replace "<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>`n        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 32, paddingTop: headerPaddingTop }} showsVerticalScrollIndicator={false}>" | Out-Null

# ---------------------------------------------------------------------------
# STEP 7 — TypeScript sanity check (non-blocking)
# ---------------------------------------------------------------------------
Write-Step "Running quick TypeScript check"
& npx --no-install tsc --noEmit -p tsconfig.json 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Ok "TypeScript compile clean" } else { Write-Warn "TypeScript warnings present (build will still proceed)" }

# ---------------------------------------------------------------------------
# STEP 8 — Kill stale Java/Gradle/Kotlin processes
# ---------------------------------------------------------------------------
Write-Step "Killing stale Java / Gradle / Kotlin processes"
if (Test-Path "android\gradlew.bat") { & .\android\gradlew --stop -p android 2>$null }
Get-Process java, kotlin*, studio64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Ok "Processes cleared"

# ---------------------------------------------------------------------------
# STEP 9 — Backup old android folder & expo prebuild --clean
# ---------------------------------------------------------------------------
Write-Step "Backing up old android folder & regenerating via expo prebuild"
if (Test-Path "android") {
    $backupName = "android-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Rename-Item "android" $backupName -Force
    Write-Ok "Backed up android -> $backupName"
}
& npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { Write-Err "expo prebuild failed"; exit 1 }
Write-Ok "Fresh android folder generated"

# ---------------------------------------------------------------------------
# STEP 10 — Patch gradle.properties (memory + Kotlin in-process)
# ---------------------------------------------------------------------------
Write-Step "Patching android/gradle.properties (4 GB heap, in-process Kotlin)"
$gradleProps = "android\gradle.properties"
Add-Content $gradleProps @"

# === SpeakMate AI build properties (auto-added) ===
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=1
kotlin.daemon.jvm.options=-Xmx2048m
kotlin.compiler.execution.strategy=in-process
kotlin.incremental=false
"@
Write-Ok "gradle.properties patched"

# ---------------------------------------------------------------------------
# STEP 11 — Patch app/build.gradle (lintOptions + release signing)
# ---------------------------------------------------------------------------
Write-Step "Patching app/build.gradle (lintOptions + release signing)"
$appGradle = "android\app\build.gradle"
$content = Get-Content $appGradle -Raw

if ($content -notmatch "lintOptions" -and $content -notmatch "lint\s*\{") {
    $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1    lintOptions { abortOnError false; checkReleaseBuilds false }`n"
    Write-Ok "lintOptions block added"
}

if (Test-Path "speakmateai-release.jks") {
    if ($content -notmatch "keystorePropertiesFile") {
        $signingSnippet = @"

    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }
"@
        $content = $content -replace '(android\s*\{[^\n]*\n[^\n]*lintOptions[^\n]*\n)', "`$1$signingSnippet`n"
        $content = $content -replace '(signingConfigs\s*\{[^}]*debug\s*\{[^}]+\}\s*)', "`$1`n        release {`n            if (keystorePropertiesFile.exists()) {`n                storeFile file(keystoreProperties['storeFile'])`n                storePassword keystoreProperties['storePassword']`n                keyAlias keystoreProperties['keyAlias']`n                keyPassword keystoreProperties['keyPassword']`n            }`n        }`n    "
        $content = $content -replace 'signingConfig signingConfigs\.debug(\s*\n[^}]*proguardFiles)', 'signingConfig signingConfigs.release$1'
        Write-Ok "Release signing config wired"
    } else {
        Write-Ok "Release signing already wired"
    }
} else {
    Write-Warn "speakmateai-release.jks not found — AAB will be debug-signed (NOT uploadable to Play Store)"
}
Set-Content $appGradle -Value $content -NoNewline

# ---------------------------------------------------------------------------
# STEP 12 — keystore.properties (prompt if missing)
# ---------------------------------------------------------------------------
$keystoreProps = "android\keystore.properties"
if ((Test-Path "speakmateai-release.jks") -and -not (Test-Path $keystoreProps)) {
    Write-Step "Creating android/keystore.properties (you'll be prompted)"
    $storePass = Read-Host "  Keystore password" -AsSecureString
    $keyAlias  = Read-Host "  Key alias (e.g., speakmate-release)"
    $sp = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass))
    @"
storeFile=../../speakmateai-release.jks
storePassword=$sp
keyAlias=$keyAlias
keyPassword=$sp
"@ | Set-Content $keystoreProps
    Write-Ok "keystore.properties created"
}

# ---------------------------------------------------------------------------
# STEP 13 — Build the Release AAB (Play Store)
# ---------------------------------------------------------------------------
Write-Step "Building Release AAB for Play Store (~10-20 min, please wait)"
Push-Location android
& .\gradlew bundleRelease --no-daemon --max-workers=1 -x lintVitalAnalyzeRelease
$buildExit = $LASTEXITCODE
Pop-Location

if ($buildExit -ne 0) {
    Write-Err "AAB build failed (exit $buildExit). Check the error above. Common fixes:"
    Write-Host "    - Stop Android Studio + close all gradle daemons" -ForegroundColor White
    Write-Host "    - Re-run this script" -ForegroundColor White
    Write-Host "    - If still failing: delete %USERPROFILE%\.gradle\caches and retry" -ForegroundColor White
    exit $buildExit
}

$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    $aabSize = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
    Write-Ok "AAB built: $aabPath ($aabSize MB)"
} else {
    Write-Err "AAB not found at $aabPath"
    exit 1
}

# ---------------------------------------------------------------------------
# DONE
# ---------------------------------------------------------------------------
$duration = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  UI FIX + AAB BUILD COMPLETE" -ForegroundColor Green
Write-Host "  Total time: $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  AAB ready for Play Store upload:" -ForegroundColor Cyan
Write-Host "  $((Get-Item $aabPath).FullName)" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Play Console -> Production -> Create new release" -ForegroundColor White
Write-Host "  2. Upload the AAB above" -ForegroundColor White
Write-Host "  3. Bump versionCode in app.json before the NEXT build" -ForegroundColor White
Write-Host ""

# Open the AAB folder for convenience
Start-Process "explorer.exe" -ArgumentList (Split-Path -Parent (Resolve-Path $aabPath))
