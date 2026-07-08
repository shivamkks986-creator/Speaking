# =============================================================================
# SpeakMate AI - Sync UI Fix Files from Cloud (NO gradle patching, NO build)
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
#      (BUMP versionCode in app.json to 4 before build!)
# =============================================================================

$ErrorActionPreference = "Stop"

$CloudBase = "https://gift-hub-sync.preview.emergentagent.com/api/fix-files"

# All 13 UI-fix files
$Files = @(
    @{ Url = "$CloudBase/useScreenInsets.ts";         Dest = "src\hooks\useScreenInsets.ts" }
    @{ Url = "$CloudBase/ScreenContainer.tsx";        Dest = "src\components\common\ScreenContainer.tsx" }
    @{ Url = "$CloudBase/HomeScreen.tsx";             Dest = "src\screens\home\HomeScreen.tsx" }
    @{ Url = "$CloudBase/AITutorScreen.tsx";          Dest = "src\screens\tutor\AITutorScreen.tsx" }
    @{ Url = "$CloudBase/SpeakingPracticeScreen.tsx"; Dest = "src\screens\speaking\SpeakingPracticeScreen.tsx" }
    @{ Url = "$CloudBase/InterviewCoachScreen.tsx";   Dest = "src\screens\interview\InterviewCoachScreen.tsx" }
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
Write-Host "==> Downloading 13 UI-fix files from cloud" -ForegroundColor Cyan
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
    Write-Host "  ALL 13 UI-FIX FILES SYNCED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
} else {
    Write-Host "[WARN] Only $downloaded / $($Files.Count) files downloaded" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  NEXT STEPS (in Android Studio):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. IMPORTANT: Bump versionCode first" -ForegroundColor White
Write-Host "     Open app.json  ->  android.versionCode : 4  (was 3)" -ForegroundColor White
Write-Host "     Also update version: '1.0.3' (was '1.0.2')" -ForegroundColor White
Write-Host ""
Write-Host "  2. Open Android Studio -> File -> Sync Project with Gradle Files" -ForegroundColor White
Write-Host ""
Write-Host "  3. Build -> Generate Signed Bundle / APK  ->  Android App Bundle" -ForegroundColor White
Write-Host "     -> Choose speakmateai-release.jks" -ForegroundColor White
Write-Host "     -> Enter keystore password" -ForegroundColor White
Write-Host "     -> Variant: release" -ForegroundColor White
Write-Host "     -> Click Create" -ForegroundColor White
Write-Host ""
Write-Host "  4. AAB will be at: android\app\release\app-release.aab" -ForegroundColor White
Write-Host ""
Write-Host "  5. Upload to Play Console:" -ForegroundColor White
Write-Host "     Internal testing  ->  Create new release  ->  Upload AAB" -ForegroundColor White
Write-Host ""
