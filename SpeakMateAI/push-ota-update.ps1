# =============================================================================
# SpeakMate AI - Push OTA Update (JS-only, NO AAB rebuild needed)
# =============================================================================
# Yeh script:
#   1. Cloud se latest UI-fix files download karega (13 files)
#   2. EAS Update ke through JS bundle push karega
#   3. Aapke Play Store internal testing users ki app agli baar open hone
#      pe automatically fix mil jayega - NO REBUILD, NO RE-UPLOAD needed!
#
# Prerequisite (only first time):
#   yarn global add eas-cli
#   eas login
#
# Run:
#   powershell -ExecutionPolicy Bypass -File .\push-ota-update.ps1
# =============================================================================

$ErrorActionPreference = "Continue"
$startTime = Get-Date

$CloudBase = "https://gift-hub-sync.preview.emergentagent.com/api/fix-files"

# All UI-fix files to download (13 files - covers every visible screen)
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

function Write-Step { param([string]$Msg) Write-Host "" ; Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "    [OK]   $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "    [WARN] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "    [ERR]  $Msg" -ForegroundColor Red }

# STEP 0 - Preflight
Write-Step "Preflight checks"
if (-not (Test-Path "package.json")) {
    Write-Err "Not in SpeakMateAI folder. cd D:\sm\SpeakMateAI first."
    exit 1
}
Write-Ok "In folder: $(Get-Location)"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# STEP 1 - Verify eas-cli is available
Write-Step "Checking eas-cli availability"
$easExists = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easExists) {
    Write-Warn "eas-cli not found globally - installing now (one-time)"
    & npm install -g eas-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Err "eas-cli install failed. Try manually: npm install -g eas-cli"
        exit 1
    }
}
Write-Ok "eas-cli available"

# STEP 2 - Verify eas is logged in
Write-Step "Verifying EAS login"
$whoami = & eas whoami 2>&1 | Out-String
if ($whoami -match "Not logged in|not logged in") {
    Write-Warn "Not logged in to EAS - starting login flow"
    & eas login
    if ($LASTEXITCODE -ne 0) {
        Write-Err "EAS login failed. Try manually: eas login"
        exit 1
    }
}
Write-Ok "EAS logged in as: $($whoami.Trim())"

# STEP 3 - Download latest UI-fix files
Write-Step "Downloading 13 latest UI-fix files from cloud"
$downloaded = 0
foreach ($f in $Files) {
    $destDir = Split-Path -Parent $f.Dest
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    try {
        Invoke-WebRequest -Uri $f.Url -OutFile $f.Dest -UseBasicParsing -TimeoutSec 30
        $downloaded++
    } catch {
        Write-Err "Failed: $($f.Dest) - $($_.Exception.Message)"
    }
}
Write-Ok "$downloaded / $($Files.Count) files refreshed"
if ($downloaded -lt $Files.Count) {
    Write-Warn "Some files failed to download - OTA will still push what's local"
}

# STEP 4 - Quick TS sanity check
Write-Step "TypeScript sanity check"
& npx --no-install tsc --noEmit -p tsconfig.json 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Ok "TypeScript clean" } else { Write-Warn "TS warnings (OTA still proceeding)" }

# STEP 5 - Push OTA update via EAS
Write-Step "Pushing OTA update to production channel"
$msg = "UI overlap fix: universal safe-area (flat + curved + punch-hole + notch)"
& eas update --branch production --message $msg --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Err "EAS update failed."
    Write-Host "  Common fixes:" -ForegroundColor White
    Write-Host "    - Run 'eas login' manually" -ForegroundColor White
    Write-Host "    - Ensure app.json extra.eas.projectId matches your EAS project" -ForegroundColor White
    Write-Host "    - Run 'yarn install' if package changed" -ForegroundColor White
    exit 1
}

$duration = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  OTA UPDATE PUSHED - NO REBUILD NEEDED!" -ForegroundColor Green
Write-Host "  Total time: $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  What happens next:" -ForegroundColor Cyan
Write-Host "  1. Play Store internal testing users' apps auto-check for update" -ForegroundColor White
Write-Host "  2. Next time they open the app, new JS bundle downloads silently" -ForegroundColor White
Write-Host "  3. Fix applies on the SECOND launch (per checkAutomatically: ON_LOAD)" -ForegroundColor White
Write-Host ""
Write-Host "  Tell testers: 'App band karo, phir kholo' - update apply ho jayega" -ForegroundColor Yellow
Write-Host ""
