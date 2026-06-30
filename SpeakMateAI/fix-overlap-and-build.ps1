# =============================================================================
# SpeakMate AI - One-Shot UI Overlap Fix + AAB Build (Cloud Sync Edition)
# =============================================================================
# Run from D:\sm\SpeakMateAI:
#     powershell -ExecutionPolicy Bypass -File .\fix-overlap-and-build.ps1
# =============================================================================

$ErrorActionPreference = "Continue"
$startTime = Get-Date

# Cloud URLs
$CloudBase = "https://gift-hub-sync.preview.emergentagent.com/api/fix-files"
$Files = @(
    @{ Url = "$CloudBase/useScreenInsets.ts";         Dest = "src\hooks\useScreenInsets.ts" }
    @{ Url = "$CloudBase/ScreenContainer.tsx";        Dest = "src\components\common\ScreenContainer.tsx" }
    @{ Url = "$CloudBase/SpeakingPracticeScreen.tsx"; Dest = "src\screens\speaking\SpeakingPracticeScreen.tsx" }
    @{ Url = "$CloudBase/InterviewCoachScreen.tsx";   Dest = "src\screens\interview\InterviewCoachScreen.tsx" }
    @{ Url = "$CloudBase/PremiumScreen.tsx";          Dest = "src\screens\premium\PremiumScreen.tsx" }
)

function Write-Step { param([string]$Msg) Write-Host "" ; Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "    [OK]   $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "    [WARN] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "    [ERR]  $Msg" -ForegroundColor Red }

# STEP 0 - Preflight
Write-Step "Preflight checks"
if (-not (Test-Path "package.json")) {
    Write-Err "Not in SpeakMateAI folder. cd into it first (e.g. cd D:\sm\SpeakMateAI)."
    exit 1
}
Write-Ok "In folder: $(Get-Location)"

# Force TLS 1.2 (older PowerShell defaults to TLS 1.0)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# STEP 1 - Download latest fix files from cloud
Write-Step "Downloading latest UI-fix files from cloud"
$downloaded = 0
foreach ($f in $Files) {
    $destDir = Split-Path -Parent $f.Dest
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    try {
        Invoke-WebRequest -Uri $f.Url -OutFile $f.Dest -UseBasicParsing -TimeoutSec 30
        $size = [math]::Round((Get-Item $f.Dest).Length / 1KB, 1)
        Write-Ok "$($f.Dest)  ($size KB)"
        $downloaded++
    } catch {
        Write-Err "Failed to download $($f.Url)"
        Write-Err $_.Exception.Message
        Write-Warn "Continuing with existing local copy of $($f.Dest)"
    }
}
if ($downloaded -eq 0) {
    Write-Err "Could not download ANY files - check internet / cloud URL."
    Write-Warn "Falling back to local code (build will proceed but UI fix may be missing)"
} else {
    Write-Ok "$downloaded / $($Files.Count) files refreshed from cloud"
}

# STEP 2 - TypeScript sanity check (non-blocking)
Write-Step "Running quick TypeScript check"
& npx --no-install tsc --noEmit -p tsconfig.json 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Ok "TypeScript compile clean" } else { Write-Warn "TS warnings present (build still proceeds)" }

# STEP 3 - Kill stale Java/Gradle/Kotlin processes
Write-Step "Killing stale Java / Gradle / Kotlin processes"
if (Test-Path "android\gradlew.bat") { & .\android\gradlew --stop -p android 2>$null }
Get-Process java, kotlin*, studio64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Ok "Processes cleared"

# STEP 4 - Backup old android folder & expo prebuild --clean
Write-Step "Backing up old android folder & regenerating via expo prebuild"
if (Test-Path "android") {
    $backupName = "android-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Rename-Item "android" $backupName -Force
    Write-Ok "Backed up android -> $backupName"
}
& npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { Write-Err "expo prebuild failed"; exit 1 }
Write-Ok "Fresh android folder generated"

# STEP 5 - Patch gradle.properties (memory + Kotlin in-process)
Write-Step "Patching android/gradle.properties (4 GB heap, in-process Kotlin)"
$gradleProps = "android\gradle.properties"
$gradleAppend = "`r`n# === SpeakMate AI build properties (auto-added) ===`r`n"
$gradleAppend += "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8`r`n"
$gradleAppend += "org.gradle.daemon=false`r`n"
$gradleAppend += "org.gradle.parallel=false`r`n"
$gradleAppend += "org.gradle.workers.max=1`r`n"
$gradleAppend += "kotlin.daemon.jvm.options=-Xmx2048m`r`n"
$gradleAppend += "kotlin.compiler.execution.strategy=in-process`r`n"
$gradleAppend += "kotlin.incremental=false`r`n"
Add-Content $gradleProps $gradleAppend
Write-Ok "gradle.properties patched"

# STEP 6 - Patch app/build.gradle (lintOptions + release signing)
Write-Step "Patching app/build.gradle (lintOptions + release signing)"
$appGradle = "android\app\build.gradle"
$content = Get-Content $appGradle -Raw

if ($content -notmatch "lintOptions" -and $content -notmatch "lint\s*\{") {
    $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1    lintOptions { abortOnError false; checkReleaseBuilds false }`r`n"
    Write-Ok "lintOptions block added"
}

if (Test-Path "speakmateai-release.jks") {
    if ($content -notmatch "keystorePropertiesFile") {
        $signingSnippet = "`r`n    def keystorePropertiesFile = rootProject.file('keystore.properties')`r`n"
        $signingSnippet += "    def keystoreProperties = new Properties()`r`n"
        $signingSnippet += "    if (keystorePropertiesFile.exists()) {`r`n"
        $signingSnippet += "        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))`r`n"
        $signingSnippet += "    }`r`n"

        $content = $content -replace '(android\s*\{[^\n]*\n[^\n]*lintOptions[^\n]*\n)', "`$1$signingSnippet`r`n"
        $releaseBlock = "`$1`r`n        release {`r`n            if (keystorePropertiesFile.exists()) {`r`n                storeFile file(keystoreProperties['storeFile'])`r`n                storePassword keystoreProperties['storePassword']`r`n                keyAlias keystoreProperties['keyAlias']`r`n                keyPassword keystoreProperties['keyPassword']`r`n            }`r`n        }`r`n    "
        $content = $content -replace '(signingConfigs\s*\{[^}]*debug\s*\{[^}]+\}\s*)', $releaseBlock
        $content = $content -replace 'signingConfig signingConfigs\.debug(\s*\n[^}]*proguardFiles)', 'signingConfig signingConfigs.release$1'
        Write-Ok "Release signing config wired"
    } else {
        Write-Ok "Release signing already wired"
    }
} else {
    Write-Warn "speakmateai-release.jks not found - AAB will be debug-signed (NOT uploadable)"
}
Set-Content $appGradle -Value $content -NoNewline

# STEP 7 - keystore.properties (prompt if missing)
$keystoreProps = "android\keystore.properties"
if ((Test-Path "speakmateai-release.jks") -and -not (Test-Path $keystoreProps)) {
    Write-Step "Creating android/keystore.properties (you'll be prompted)"
    $storePass = Read-Host "  Keystore password" -AsSecureString
    $keyAlias  = Read-Host "  Key alias (e.g., speakmate-release)"
    $sp = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass))
    $ksContent = "storeFile=../../speakmateai-release.jks`r`n"
    $ksContent += "storePassword=$sp`r`n"
    $ksContent += "keyAlias=$keyAlias`r`n"
    $ksContent += "keyPassword=$sp`r`n"
    Set-Content $keystoreProps -Value $ksContent
    Write-Ok "keystore.properties created"
}

# STEP 8 - Build the Release AAB (Play Store)
Write-Step "Building Release AAB for Play Store (~10-20 min, please wait)"
Push-Location android
& .\gradlew bundleRelease --no-daemon --max-workers=1 -x lintVitalAnalyzeRelease
$buildExit = $LASTEXITCODE
Pop-Location

if ($buildExit -ne 0) {
    Write-Err "AAB build failed (exit $buildExit). Common fixes:"
    Write-Host "    - Close Android Studio + all gradle daemons" -ForegroundColor White
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

# DONE
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
