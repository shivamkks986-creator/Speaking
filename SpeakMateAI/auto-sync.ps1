# =============================================================================
# AUTO-SYNC BOOTSTRAP SCRIPT (self-updating)
# =============================================================================
# Ye ek baar cloud se `sync-ui-fix.ps1` ka fresh version pull karega, phir
# usko run karega. Iska matlab jab bhi backend pe naye files add hote hain,
# aap sirf `.\auto-sync.ps1` chalao — sync script khud latest ho jayega.
#
# Usage (D:\sm\SpeakMateAI se run karo):
#     powershell -ExecutionPolicy Bypass -File .\auto-sync.ps1
#     powershell -ExecutionPolicy Bypass -File .\auto-sync.ps1 -InstallDeps
#     powershell -ExecutionPolicy Bypass -File .\auto-sync.ps1 -FullRebuild
#
# Flags:
#     -InstallDeps    yarn install bhi chalayega (naye native modules ke liye)
#     -FullRebuild    expo prebuild --clean bhi chalayega (android/ regenerate)
#     -BackendUrl     Custom backend URL (default: production Emergent URL)
# =============================================================================

param(
    [string]$BackendUrl = "https://gift-hub-sync.emergent.host",
    [switch]$InstallDeps = $false,
    [switch]$FullRebuild = $false,
    [switch]$ClearMetro = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   SpeakMate AI  ·  Auto-Sync Bootstrap" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Backend:  $BackendUrl" -ForegroundColor Gray
Write-Host ""

# ---------------------------------------------------------------------------
# STEP 1: Fresh sync-ui-fix.ps1 khud download karo
# ---------------------------------------------------------------------------
Write-Host "[1/5] Downloading latest sync-ui-fix.ps1..." -ForegroundColor Yellow
$syncUrl = "$BackendUrl/api/fix-files/sync-ui-fix.ps1"
try {
    Invoke-WebRequest -Uri $syncUrl -OutFile "sync-ui-fix.ps1" -UseBasicParsing -TimeoutSec 30
    Write-Host "      OK — sync-ui-fix.ps1 refreshed" -ForegroundColor Green
} catch {
    Write-Host "      FAILED to fetch: $syncUrl" -ForegroundColor Red
    Write-Host "      Check backend URL. Is app deployed?" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# STEP 2: Latest sync script run karo (saare 30+ files pull hongi)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Running sync-ui-fix.ps1 to pull all files..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File .\sync-ui-fix.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      sync-ui-fix.ps1 non-zero exit — continuing anyway" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# STEP 3: Verify critical files present hain
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Verifying critical files..." -ForegroundColor Yellow
$must = @(
    "src\components\common\EvaluatingProgress.tsx",
    "src\components\common\AdBanner.tsx",
    "src\components\common\LimitReachedModal.tsx",
    "src\services\adsService.ts",
    "src\services\billingService.ts",
    "src\contexts\AuthContext.tsx",
    "App.tsx",
    "app.json",
    "package.json"
)
$missing = @()
foreach ($f in $must) {
    if (Test-Path $f) {
        Write-Host "      OK    $f" -ForegroundColor Green
    } else {
        Write-Host "      MISS  $f" -ForegroundColor Red
        $missing += $f
    }
}
if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "MISSING FILES:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Check backend $BackendUrl/api/fix-files listing." -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# STEP 4: -InstallDeps → yarn install
# ---------------------------------------------------------------------------
if ($InstallDeps -or $FullRebuild) {
    Write-Host ""
    Write-Host "[4/5] Running yarn install (naye native modules)..." -ForegroundColor Yellow
    yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      yarn install FAILED" -ForegroundColor Red
        exit 1
    }
    # Verify Phase 2/3 native modules
    $nativeMods = @(
        "node_modules\react-native-google-mobile-ads",
        "node_modules\react-native-iap",
        "node_modules\@react-native-google-signin\google-signin"
    )
    foreach ($m in $nativeMods) {
        if (Test-Path $m) {
            Write-Host "      OK    $m" -ForegroundColor Green
        } else {
            Write-Host "      MISS  $m — try:  yarn add <package>" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "[4/5] Skipping yarn install  (use -InstallDeps to run it)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# STEP 5: -FullRebuild → expo prebuild + sync script dobara
# ---------------------------------------------------------------------------
if ($FullRebuild) {
    Write-Host ""
    Write-Host "[5/5] Running expo prebuild --clean (android/ regenerate)..." -ForegroundColor Yellow
    npx expo prebuild --platform android --clean --no-install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      expo prebuild FAILED" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "      Re-running sync-ui-fix.ps1 (prebuild ne styles.xml + build.gradle overwrite kiya hoga)..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File .\sync-ui-fix.ps1
} elseif ($ClearMetro) {
    Write-Host ""
    Write-Host "[5/5] Clearing Metro bundler cache..." -ForegroundColor Yellow
    if (Test-Path "$env:TEMP\metro-cache") {
        Remove-Item -Recurse -Force "$env:TEMP\metro-cache" -ErrorAction SilentlyContinue
    }
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    }
    Write-Host "      Metro cache cleared" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[5/5] Skipping prebuild  (use -FullRebuild for prebuild + resync)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# DONE
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   AUTO-SYNC COMPLETE" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
if (-not $InstallDeps -and -not $FullRebuild) {
    Write-Host "  1. Run:  npx expo start --clear   (Metro dev)" -ForegroundColor Gray
    Write-Host "  2. Ya AAB build ke liye:  .\auto-sync.ps1 -FullRebuild" -ForegroundColor Gray
} elseif ($FullRebuild) {
    Write-Host "  1. Android Studio kholo → File → Open → D:\sm\SpeakMateAI\android" -ForegroundColor White
    Write-Host "  2. Gradle sync complete hone do (~2-3 min)" -ForegroundColor White
    Write-Host "  3. Build → Generate Signed Bundle / APK → Android App Bundle" -ForegroundColor White
    Write-Host "  4. Keystore: speakmateai-release.jks, Variant: release" -ForegroundColor White
    Write-Host "  5. AAB milega: android\app\release\app-release.aab" -ForegroundColor White
    Write-Host ""
    Write-Host "  Ya command-line se:" -ForegroundColor Gray
    Write-Host "     cd android; .\gradlew bundleRelease" -ForegroundColor Gray
} else {
    Write-Host "  1. Run:  npx expo start --clear" -ForegroundColor Gray
    Write-Host "  2. Ya AAB build ke liye:  .\auto-sync.ps1 -FullRebuild" -ForegroundColor Gray
}
Write-Host ""
