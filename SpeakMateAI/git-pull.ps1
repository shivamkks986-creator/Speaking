# =============================================================================
# GIT-PULL.PS1 — Safe pull from GitHub with auto conflict resolution
# =============================================================================
# Ye script safely GitHub se latest changes pull karta hai:
#   1. Untracked local files ko clean karta hai (aapke temporary downloads)
#   2. Uncommitted local changes stash karta hai (backup)
#   3. Latest code pull karta hai
#   4. Package.json badla hai to yarn install auto chalata hai
#   5. Sensitive files (keystore, google-services, .env) preserve rakhta hai
#
# Usage (D:\sm se run karo — jaha .git folder hai):
#     powershell -ExecutionPolicy Bypass -File .\git-pull.ps1
#     powershell -ExecutionPolicy Bypass -File .\git-pull.ps1 -Branch SpeakMATEAI
#     powershell -ExecutionPolicy Bypass -File .\git-pull.ps1 -Force
#     powershell -ExecutionPolicy Bypass -File .\git-pull.ps1 -InstallDeps
# =============================================================================

param(
    [string]$Branch = "SpeakMATEAI",
    [switch]$Force = $false,        # git reset --hard (nuke local changes)
    [switch]$InstallDeps = $true,   # yarn install auto if package.json changed
    [switch]$SkipStash = $false     # don't stash local changes
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   Git Pull  ·  SpeakMate AI" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Branch:  $Branch" -ForegroundColor Gray
Write-Host "  Started: $startTime" -ForegroundColor Gray
Write-Host ""

# ---------------------------------------------------------------------------
# STEP 1: Verify hum git repo mein hain
# ---------------------------------------------------------------------------
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: .git folder not found here!" -ForegroundColor Red
    Write-Host "Current folder: $(Get-Location)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Script D:\sm se chalao (jaha .git folder hai)." -ForegroundColor Yellow
    Write-Host "     cd D:\sm" -ForegroundColor Cyan
    Write-Host "     .\git-pull.ps1" -ForegroundColor Cyan
    exit 1
}

# ---------------------------------------------------------------------------
# STEP 2: Package.json ka BEFORE hash lo (baad mein compare karenge)
# ---------------------------------------------------------------------------
$pkgPath = "SpeakMateAI\package.json"
$appJsonPath = "SpeakMateAI\app.json"
$hashBefore_pkg = ""
$hashBefore_app = ""
if (Test-Path $pkgPath) {
    $hashBefore_pkg = (Get-FileHash $pkgPath -Algorithm MD5).Hash
}
if (Test-Path $appJsonPath) {
    $hashBefore_app = (Get-FileHash $appJsonPath -Algorithm MD5).Hash
}

# ---------------------------------------------------------------------------
# STEP 3: Sensitive files preserve karo (git pull inko touch nahi karega but safe hai)
# ---------------------------------------------------------------------------
Write-Host "[1/6] Backing up sensitive files..." -ForegroundColor Yellow
$backupDir = ".git-pull-backup-temp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$sensitive = @(
    "SpeakMateAI\android\app\speakmateai-release.jks",
    "SpeakMateAI\google-services.json",
    "SpeakMateAI\.env",
    "SpeakMateAI\keystore-info.txt",
    "SpeakMateAI\keystore.properties",
    "SpeakMateAI\android\keystore.properties",
    "SpeakMateAI\android\local.properties"
)
foreach ($s in $sensitive) {
    if (Test-Path $s) {
        $fileName = Split-Path $s -Leaf
        Copy-Item $s "$backupDir\$fileName" -Force
        Write-Host "      backed up: $fileName" -ForegroundColor Gray
    }
}

# ---------------------------------------------------------------------------
# STEP 4: Stash / Clean local changes
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/6] Handling local changes..." -ForegroundColor Yellow

if ($Force) {
    Write-Host "      -Force flag: resetting local changes (git reset --hard)" -ForegroundColor Red
    git reset --hard HEAD
} elseif (-not $SkipStash) {
    $status = git status --porcelain
    if ($status) {
        Write-Host "      Local changes detected — stashing..." -ForegroundColor Gray
        git stash push -u -m "auto-stash before pull $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    } else {
        Write-Host "      No local changes" -ForegroundColor Gray
    }
}

# Clean untracked files that would block pull
Write-Host "      Cleaning untracked files (safe — backed up above)..." -ForegroundColor Gray
git clean -fd | Out-Null

# ---------------------------------------------------------------------------
# STEP 5: git pull
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/6] Fetching from GitHub..." -ForegroundColor Yellow
git fetch origin $Branch

Write-Host ""
Write-Host "[4/6] Pulling branch '$Branch'..." -ForegroundColor Yellow
$pullOut = git pull origin $Branch 2>&1
$pullOut | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "PULL FAILED — try with -Force:" -ForegroundColor Red
    Write-Host "   .\git-pull.ps1 -Force" -ForegroundColor Yellow
    # Restore sensitive files even on fail
    foreach ($s in $sensitive) {
        $fileName = Split-Path $s -Leaf
        if (Test-Path "$backupDir\$fileName") { Copy-Item "$backupDir\$fileName" $s -Force }
    }
    Remove-Item -Recurse -Force $backupDir -ErrorAction SilentlyContinue
    exit 1
}

# ---------------------------------------------------------------------------
# STEP 6: Restore sensitive files (if git overwrote them or removed)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/6] Restoring sensitive files..." -ForegroundColor Yellow
foreach ($s in $sensitive) {
    $fileName = Split-Path $s -Leaf
    if (Test-Path "$backupDir\$fileName") {
        $dir = Split-Path $s -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        Copy-Item "$backupDir\$fileName" $s -Force
        Write-Host "      restored: $s" -ForegroundColor Green
    }
}
Remove-Item -Recurse -Force $backupDir -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# STEP 7: Check if yarn install needed
# ---------------------------------------------------------------------------
$hashAfter_pkg = ""
$hashAfter_app = ""
if (Test-Path $pkgPath) { $hashAfter_pkg = (Get-FileHash $pkgPath -Algorithm MD5).Hash }
if (Test-Path $appJsonPath) { $hashAfter_app = (Get-FileHash $appJsonPath -Algorithm MD5).Hash }

$pkgChanged = $hashBefore_pkg -ne $hashAfter_pkg
$appChanged = $hashBefore_app -ne $hashAfter_app

Write-Host ""
Write-Host "[6/6] Post-pull checks..." -ForegroundColor Yellow
Write-Host "      package.json changed: $pkgChanged" -ForegroundColor Gray
Write-Host "      app.json changed:     $appChanged" -ForegroundColor Gray

if ($pkgChanged -and $InstallDeps) {
    Write-Host ""
    Write-Host "      package.json badla hai — yarn install chala raha hoon..." -ForegroundColor Yellow
    Push-Location SpeakMateAI
    yarn install
    $yarnExit = $LASTEXITCODE
    Pop-Location
    if ($yarnExit -ne 0) {
        Write-Host "      yarn install failed. Manually chalao: cd SpeakMateAI; yarn install" -ForegroundColor Red
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
$took = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   PULL COMPLETE  ($took sec)" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Latest commits:" -ForegroundColor White
git log --oneline -3

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($pkgChanged -or $appChanged) {
    Write-Host "  cd SpeakMateAI" -ForegroundColor White
    Write-Host "  npx expo prebuild --platform android --clean --no-install    # (app.json / plugins badle)" -ForegroundColor Gray
    Write-Host "  .\build-aab.ps1 -SkipSync -Clean                              # AAB build" -ForegroundColor Gray
} else {
    Write-Host "  cd SpeakMateAI" -ForegroundColor White
    Write-Host "  npx expo start --clear                                         # dev test" -ForegroundColor Gray
    Write-Host "  .\build-aab.ps1 -SkipSync                                      # AAB build" -ForegroundColor Gray
}
Write-Host ""
