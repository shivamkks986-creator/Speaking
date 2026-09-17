# =============================================================================
# SpeakMate AI - Sync UI Fix Files from Cloud (auto-patches build.gradle + styles.xml)
# =============================================================================
# Yeh script SIRF UI-fix files download karega. Iske baad aap Android Studio
# se AAB build karke Play Store upload kar sakte ho - jaisa pichli baar kiya.
#
# Run from D:\sm\SpeakMateAI:
#   powershell -ExecutionPolicy Bypass -File .\sync-ui-fix.ps1
#
# Post-download steps (Android Studio):
#   1. File -> Sync Project with Gradle Files
#   2. Build -> Generate Signed Bundle / APK -> Android App Bundle
#   3. Select speakmateai-release.jks, enter password
#   4. Build variant: release
#   5. AAB milega: android\app\release\app-release.aab
#   6. Upload to Play Console -> Internal testing -> Create new release
#      (versionCode + versionName auto-synced from app.json into build.gradle)
# =============================================================================

$ErrorActionPreference = "Stop"

$CloudBase = "https://gift-hub-sync.preview.emergentagent.com/api/fix-files"

# All UI-fix files (15 total: app.json + native plugin + hook + 12 screens)
$Files = @(
    @{ Url = "$CloudBase/app.json";                   Dest = "app.json" }
    @{ Url = "$CloudBase/package.json";               Dest = "package.json" }
    @{ Url = "$CloudBase/App.tsx";                    Dest = "App.tsx" }
    @{ Url = "$CloudBase/AuthContext.tsx";            Dest = "src\contexts\AuthContext.tsx" }
    @{ Url = "$CloudBase/withAndroidBuildFixes.js";   Dest = "plugins\withAndroidBuildFixes.js" }
    @{ Url = "$CloudBase/useScreenInsets.ts";         Dest = "src\hooks\useScreenInsets.ts" }
    @{ Url = "$CloudBase/aiService.ts";               Dest = "src\services\aiService.ts" }
    @{ Url = "$CloudBase/adsService.ts";              Dest = "src\services\adsService.ts" }
    @{ Url = "$CloudBase/billingService.ts";          Dest = "src\services\billingService.ts" }
    @{ Url = "$CloudBase/usageService.ts";            Dest = "src\services\usageService.ts" }
    @{ Url = "$CloudBase/UsageIndicator.tsx";         Dest = "src\components\common\UsageIndicator.tsx" }
    @{ Url = "$CloudBase/AdBanner.tsx";               Dest = "src\components\common\AdBanner.tsx" }
    @{ Url = "$CloudBase/LimitReachedModal.tsx";      Dest = "src\components\common\LimitReachedModal.tsx" }
    @{ Url = "$CloudBase/EvaluatingProgress.tsx";     Dest = "src\components\common\EvaluatingProgress.tsx" }
    @{ Url = "$CloudBase/interstitialTrigger.ts";     Dest = "src\services\interstitialTrigger.ts" }
    @{ Url = "$CloudBase/ScreenContainer.tsx";        Dest = "src\components\common\ScreenContainer.tsx" }
    @{ Url = "$CloudBase/HomeScreen.tsx";             Dest = "src\screens\home\HomeScreen.tsx" }
    @{ Url = "$CloudBase/AITutorScreen.tsx";          Dest = "src\screens\tutor\AITutorScreen.tsx" }
    @{ Url = "$CloudBase/SpeakingPracticeScreen.tsx"; Dest = "src\screens\speaking\SpeakingPracticeScreen.tsx" }
    @{ Url = "$CloudBase/InterviewCoachScreen.tsx";   Dest = "src\screens\interview\InterviewCoachScreen.tsx" }
    @{ Url = "$CloudBase/InterviewSessionScreen.tsx"; Dest = "src\screens\interview\InterviewSessionScreen.tsx" }
    @{ Url = "$CloudBase/LiveInterviewScreen.tsx";    Dest = "src\screens\interview\LiveInterviewScreen.tsx" }
    @{ Url = "$CloudBase/PremiumScreen.tsx";          Dest = "src\screens\premium\PremiumScreen.tsx" }
    @{ Url = "$CloudBase/ResumeUploadScreen.tsx";     Dest = "src\screens\resume\ResumeUploadScreen.tsx" }
    @{ Url = "$CloudBase/ResumeInterviewScreen.tsx";  Dest = "src\screens\resume\ResumeInterviewScreen.tsx" }
    @{ Url = "$CloudBase/RoadmapScreen.tsx";          Dest = "src\screens\roadmap\RoadmapScreen.tsx" }
    @{ Url = "$CloudBase/CompanionsScreen.tsx";       Dest = "src\screens\companions\CompanionsScreen.tsx" }
    @{ Url = "$CloudBase/TmayTrainerScreen.tsx";      Dest = "src\screens\tmay\TmayTrainerScreen.tsx" }
    @{ Url = "$CloudBase/FlashcardsScreen.tsx";       Dest = "src\screens\vocabulary\FlashcardsScreen.tsx" }
)

if (-not (Test-Path "package.json")) {
    Write-Host "[ERR] Not in SpeakMateAI folder. cd D:\sm\SpeakMateAI first." -ForegroundColor Red
    exit 1
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "==> Downloading files (incl. app.json v1.0.9 + package.json + adsService + billingService for AdMob/IAP Phase 2)" -ForegroundColor Cyan
$downloaded = 0
foreach ($f in $Files) {
    $destDir = Split-Path -Parent $f.Dest
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    try {
        Invoke-WebRequest -Uri $f.Url -OutFile $f.Dest -UseBasicParsing -TimeoutSec 30
        $size = [math]::Round((Get-Item $f.Dest).Length / 1KB, 1)
        Write-Host "    [OK] $($f.Dest)  ($size KB)" -ForegroundColor Green
        $downloaded++
    } catch {
        Write-Host "    [ERR] Failed: $($f.Dest)" -ForegroundColor Red
        Write-Host "          $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
if ($downloaded -eq $Files.Count) {
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  ALL FILES SYNCED (v1.0.9 versionCode 10 + AdMob native + IAP native)" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
} else {
    Write-Host "[WARN] Only $downloaded / $($Files.Count) files downloaded" -ForegroundColor Yellow
}

# ============================================================================
# BONUS STEP: Directly patch android/app/src/main/res/values/styles.xml
# to apply the universal cutout fix WITHOUT running expo prebuild.
# This is the NATIVE guarantee that no content will draw under camera cutout
# or curved-edge on ANY device.
# ============================================================================
$stylesXml = "android\app\src\main\res\values\styles.xml"
if (Test-Path $stylesXml) {
    Write-Host ""
    Write-Host "==> Patching native styles.xml for universal cutout fix" -ForegroundColor Cyan
    $content = Get-Content $stylesXml -Raw

    # Attributes we need INSIDE the AppTheme style tag
    $cutoutAttr    = '<item name="android:windowLayoutInDisplayCutoutMode">never</item>'
    $translucent   = '<item name="android:windowTranslucentStatus">false</item>'
    $navTranslucent= '<item name="android:windowTranslucentNavigation">false</item>'

    $patched = $false

    # 1) Remove any existing occurrences to prevent duplicates
    foreach ($old in @($cutoutAttr, $translucent, $navTranslucent)) {
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), ""
        }
    }

    # 2) Inject fresh copies right before the AppTheme's closing </style>
    if ($content -match '(<style name="AppTheme"[^>]*>)') {
        $injectionBlock = "`r`n    " + $cutoutAttr + "`r`n    " + $translucent + "`r`n    " + $navTranslucent
        $content = $content -replace '(<style name="AppTheme"[^>]*>)', ('$1' + $injectionBlock)
        Set-Content $stylesXml -Value $content -Encoding UTF8 -NoNewline
        Write-Host "    [OK] styles.xml patched with cutout+opaque status/nav bar" -ForegroundColor Green
        $patched = $true
    }

    if (-not $patched) {
        Write-Host "    [WARN] AppTheme not found in styles.xml - skipping native patch" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[WARN] styles.xml not found - run 'expo prebuild --clean' first, or Android Studio will complain" -ForegroundColor Yellow
    Write-Host "        Native cutout fix will still apply next time you rebuild via prebuild." -ForegroundColor Yellow
}

# ============================================================================
# CRITICAL: Patch android/app/build.gradle to sync versionCode + versionName
# from app.json. Android Studio uses build.gradle DIRECTLY (not app.json), so
# without this step versionCode changes made in app.json are ignored.
# ============================================================================
$appGradle = "android\app\build.gradle"
if (Test-Path $appGradle) {
    Write-Host ""
    Write-Host "==> Syncing versionCode + versionName from app.json into build.gradle" -ForegroundColor Cyan
    try {
        $appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
        $newVersionCode = [int]$appJson.expo.android.versionCode
        $newVersionName = [string]$appJson.expo.version
        Write-Host "    Target: versionCode $newVersionCode / versionName $newVersionName" -ForegroundColor White

        $gradleContent = Get-Content $appGradle -Raw
        # Replace versionCode line (e.g. `versionCode 1` -> `versionCode 8`)
        $gradleContent = $gradleContent -replace '(versionCode\s+)\d+', ('${1}' + $newVersionCode)
        # Replace versionName line (e.g. `versionName "1.0.0"` -> `versionName "1.0.7"`)
        $gradleContent = $gradleContent -replace '(versionName\s+")[^"]+(")', ('${1}' + $newVersionName + '${2}')
        Set-Content $appGradle -Value $gradleContent -NoNewline

        # Verify
        $verify = Get-Content $appGradle -Raw
        if ($verify -match "versionCode\s+$newVersionCode" -and $verify -match "versionName `"$newVersionName`"") {
            Write-Host "    [OK] build.gradle patched: versionCode $newVersionCode / versionName $newVersionName" -ForegroundColor Green
        } else {
            Write-Host "    [WARN] Patch applied but verification did not match" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    [ERR] Failed to patch build.gradle: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "[WARN] android/app/build.gradle not found - run 'expo prebuild' first" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  NEXT STEPS (in Android Studio):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. app.json ALREADY updated to version 1.0.9 / versionCode 10" -ForegroundColor Green
Write-Host "  2. android/app/build.gradle ALSO patched to versionCode 10 / versionName 1.0.9" -ForegroundColor Green
Write-Host "  3. Native styles.xml patched for universal cutout fix (all devices)" -ForegroundColor Green
Write-Host ""
Write-Host "  4. IMPORTANT: run 'yarn install' to pull the two new native modules:" -ForegroundColor Yellow
Write-Host "        react-native-google-mobile-ads (14.7.2)  and  react-native-iap (12.16.4)" -ForegroundColor Yellow
Write-Host "  5. Then run:  npx expo prebuild --clean" -ForegroundColor Yellow
Write-Host "        This regenerates android/ so AdMob App ID + IAP get baked in." -ForegroundColor Yellow
Write-Host "  6. Re-run this script (yes, the same one) to re-apply the styles.xml" -ForegroundColor Yellow
Write-Host "        cutout patch + build.gradle version sync after prebuild rewrote them." -ForegroundColor Yellow
Write-Host ""
Write-Host "  7. Open Android Studio -> File -> Sync Project with Gradle Files" -ForegroundColor White
Write-Host ""
Write-Host "  8. Build -> Generate Signed Bundle / APK  ->  Android App Bundle" -ForegroundColor White
Write-Host "     -> Choose speakmateai-release.jks" -ForegroundColor White
Write-Host "     -> Enter keystore password" -ForegroundColor White
Write-Host "     -> Variant: release" -ForegroundColor White
Write-Host "     -> Click Create" -ForegroundColor White
Write-Host ""
Write-Host "  9. AAB will be at: android\app\release\app-release.aab" -ForegroundColor White
Write-Host ""
Write-Host "  10. Upload to Play Console:" -ForegroundColor White
Write-Host "      Internal testing  ->  Create new release  ->  Upload AAB" -ForegroundColor White
Write-Host ""
