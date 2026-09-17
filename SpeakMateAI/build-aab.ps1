# =============================================================================
# BUILD-AAB.PS1 — Fully automated Android AAB build (no Android Studio needed)
# =============================================================================
# Ek command mein poora Play Store-ready AAB banata hai:
#   1. Latest code sync (auto-sync.ps1 chalata hai)
#   2. yarn install (naye modules)
#   3. expo prebuild --clean (android/ regenerate)
#   4. sync script dobara (styles.xml + build.gradle patches)
#   5. local.properties banata hai (Android SDK path detect karke)
#   6. keystore.properties banata hai (password 1 baar puchega, cache karega)
#   7. gradlew clean bundleRelease chalata hai
#   8. AAB verify + folder open
#
# Usage (D:\sm\SpeakMateAI se):
#     powershell -ExecutionPolicy Bypass -File .\build-aab.ps1
#     powershell -ExecutionPolicy Bypass -File .\build-aab.ps1 -SkipSync
#     powershell -ExecutionPolicy Bypass -File .\build-aab.ps1 -Clean
# =============================================================================

param(
    [string]$BackendUrl = "https://gift-hub-sync.emergent.host",
    [string]$KeystorePath = "android\app\speakmateai-release.jks",
    [string]$KeyAlias = "speakmateai-release",
    [switch]$SkipSync = $false,     # Skip auto-sync (fast rebuild)
    [switch]$Clean = $false,        # gradlew clean bhi chalao
    [switch]$OpenFolder = $true     # AAB folder Explorer mein khol dega
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

function Write-Section($msg) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  SpeakMate AI  ·  Auto-Build AAB (v1.0.9)" -ForegroundColor Magenta
Write-Host "  Started at: $startTime" -ForegroundColor Gray

# -----------------------------------------------------------------------------
# STEP 1: Auto-sync + prebuild (unless -SkipSync)
# -----------------------------------------------------------------------------
if (-not $SkipSync) {
    Write-Section "STEP 1/7 : Auto-sync + Fresh Install + Prebuild"

    if (-not (Test-Path "auto-sync.ps1")) {
        Write-Host "auto-sync.ps1 not found — bootstrapping..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri "$BackendUrl/api/fix-files/auto-sync.ps1" -OutFile "auto-sync.ps1" -UseBasicParsing -TimeoutSec 30
        } catch {
            Write-Host "Failed to fetch auto-sync.ps1 from $BackendUrl" -ForegroundColor Red
            Write-Host "Check backend URL / connectivity" -ForegroundColor Red
            exit 1
        }
    }

    & powershell -ExecutionPolicy Bypass -File .\auto-sync.ps1 -BackendUrl $BackendUrl -FullRebuild
    if ($LASTEXITCODE -ne 0) {
        Write-Host "auto-sync -FullRebuild FAILED — aborting" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Section "STEP 1/7 : SKIPPED  (-SkipSync flag)"
}

# -----------------------------------------------------------------------------
# STEP 2: Android SDK detect karo aur local.properties banao
# -----------------------------------------------------------------------------
Write-Section "STEP 2/7 : Android SDK detection + local.properties"

$sdkCandidates = @(
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT",
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "D:\Android\Sdk"
)
$sdkPath = $null
foreach ($p in $sdkCandidates) {
    if ($p -and (Test-Path $p) -and (Test-Path (Join-Path $p "platform-tools"))) {
        $sdkPath = $p
        break
    }
}
if (-not $sdkPath) {
    Write-Host "Android SDK not found! Install Android Studio ya SDK command-line tools." -ForegroundColor Red
    Write-Host "Ya manually set:  `$env:ANDROID_HOME = 'C:\path\to\Sdk'" -ForegroundColor Yellow
    exit 1
}
Write-Host "  SDK path: $sdkPath" -ForegroundColor Green
$sdkForward = $sdkPath -replace '\\', '/'
"sdk.dir=$sdkForward" | Out-File -Encoding ASCII -NoNewline "android\local.properties"
Write-Host "  android\local.properties written" -ForegroundColor Green

# Also set env vars for gradle
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath

# -----------------------------------------------------------------------------
# STEP 3: Java detect (Android needs JDK 17)
# -----------------------------------------------------------------------------
Write-Section "STEP 3/7 : Java / JDK detection"

$javaVersion = $null
try {
    $javaVersion = (& java -version 2>&1) -join " "
    Write-Host "  $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  Java not on PATH — trying Android Studio's JBR..." -ForegroundColor Yellow
    $jbrCandidates = @(
        "$env:ProgramFiles\Android\Android Studio\jbr",
        "${env:ProgramFiles(x86)}\Android\Android Studio\jbr",
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
    )
    foreach ($jbr in $jbrCandidates) {
        if (Test-Path (Join-Path $jbr "bin\java.exe")) {
            $env:JAVA_HOME = $jbr
            $env:PATH = "$jbr\bin;$env:PATH"
            Write-Host "  Using JBR: $jbr" -ForegroundColor Green
            break
        }
    }
    if (-not $env:JAVA_HOME) {
        Write-Host "  Java 17 not found. Install JDK 17 ya Android Studio." -ForegroundColor Red
        exit 1
    }
}

# -----------------------------------------------------------------------------
# STEP 4: Keystore password (cache karta hai keystore.properties mein)
# -----------------------------------------------------------------------------
Write-Section "STEP 4/7 : Keystore configuration"

$keystoreFull = Join-Path (Get-Location) $KeystorePath
if (-not (Test-Path $keystoreFull)) {
    Write-Host "  Keystore not found at: $keystoreFull" -ForegroundColor Red
    Write-Host "  Copy your speakmateai-release.jks to android\app\" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Keystore: $keystoreFull" -ForegroundColor Green

$keystoreProps = "android\keystore.properties"
if (Test-Path $keystoreProps) {
    Write-Host "  keystore.properties already present — reusing" -ForegroundColor Green
} else {
    Write-Host "  Enter keystore password (typed input hidden):" -ForegroundColor Yellow
    $storePwd = Read-Host -AsSecureString "  MYAPP_UPLOAD_STORE_PASSWORD"
    $keyPwd = Read-Host -AsSecureString "  MYAPP_UPLOAD_KEY_PASSWORD  (Enter for same)"

    $storePwdPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePwd))
    $keyPwdPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPwd))
    if (-not $keyPwdPlain) { $keyPwdPlain = $storePwdPlain }

    @"
MYAPP_UPLOAD_STORE_FILE=speakmateai-release.jks
MYAPP_UPLOAD_KEY_ALIAS=$KeyAlias
MYAPP_UPLOAD_STORE_PASSWORD=$storePwdPlain
MYAPP_UPLOAD_KEY_PASSWORD=$keyPwdPlain
"@ | Out-File -Encoding ASCII $keystoreProps -NoNewline

    Write-Host "  keystore.properties cached (add to .gitignore!)" -ForegroundColor Green
}

# Ensure android/app/build.gradle reads from keystore.properties
$buildGradle = "android\app\build.gradle"
$gradleContent = Get-Content $buildGradle -Raw
if ($gradleContent -notmatch "keystore.properties") {
    Write-Host "  Patching android\app\build.gradle to read keystore.properties..." -ForegroundColor Yellow

    $signingBlock = @'

    signingConfigs {
        release {
            def kp = new Properties()
            def kpFile = rootProject.file("keystore.properties")
            if (kpFile.exists()) { kp.load(new FileInputStream(kpFile)) }
            storeFile file(kp['MYAPP_UPLOAD_STORE_FILE'] ?: 'debug.keystore')
            storePassword kp['MYAPP_UPLOAD_STORE_PASSWORD'] ?: ''
            keyAlias kp['MYAPP_UPLOAD_KEY_ALIAS'] ?: ''
            keyPassword kp['MYAPP_UPLOAD_KEY_PASSWORD'] ?: ''
        }
    }
'@
    # Inject before buildTypes
    $gradleContent = $gradleContent -replace '(\s+buildTypes\s*\{)', "$signingBlock`n`$1"
    # Set release buildType to use signingConfig.release
    $gradleContent = $gradleContent -replace '(release\s*\{[^}]*?)(signingConfig[^\r\n]*)', "`$1signingConfig signingConfigs.release"
    if ($gradleContent -notmatch 'signingConfig signingConfigs.release') {
        $gradleContent = $gradleContent -replace '(release\s*\{)', "`$1`n            signingConfig signingConfigs.release"
    }
    $gradleContent | Out-File -Encoding ASCII $buildGradle -NoNewline
    Write-Host "  build.gradle patched" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# STEP 5: gradlew clean (optional)
# -----------------------------------------------------------------------------
if ($Clean) {
    Write-Section "STEP 5/7 : gradlew clean"
    Push-Location android
    & .\gradlew clean --no-daemon
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        Write-Host "gradlew clean FAILED" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Section "STEP 5/7 : SKIPPED  (use -Clean for fresh build)"
}

# -----------------------------------------------------------------------------
# STEP 6: gradlew bundleRelease (the actual AAB build)
# -----------------------------------------------------------------------------
Write-Section "STEP 6/7 : gradlew bundleRelease (~5-8 min)"

Push-Location android
& .\gradlew bundleRelease --no-daemon --stacktrace 2>&1 | Tee-Object -Variable gradleLog
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "  gradlew bundleRelease FAILED (exit $exitCode)" -ForegroundColor Red
    Write-Host "  Last 30 lines of output above ^" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Common fixes:" -ForegroundColor Yellow
    Write-Host "     * gradlew clean karo:  .\build-aab.ps1 -Clean -SkipSync" -ForegroundColor Gray
    Write-Host "     * Password galat:  Remove-Item android\keystore.properties  aur dobara chalao" -ForegroundColor Gray
    Write-Host "     * Duplicate class:  cd android; .\gradlew clean; cd .." -ForegroundColor Gray
    Write-Host "     * OOM error:  gradle.properties mein org.gradle.jvmargs=-Xmx4g set karo" -ForegroundColor Gray
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 7: Verify + report
# -----------------------------------------------------------------------------
Write-Section "STEP 7/7 : Verify AAB"

$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aabPath)) {
    Write-Host "  AAB not found at expected path: $aabPath" -ForegroundColor Red
    Write-Host "  Check android\app\build\outputs\ manually" -ForegroundColor Yellow
    exit 1
}

$aabFull = (Get-Item $aabPath).FullName
$size = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
$took = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  AAB Path:  $aabFull" -ForegroundColor White
Write-Host "  Size:      $size MB" -ForegroundColor White
Write-Host "  Duration:  $took minutes" -ForegroundColor White
Write-Host ""

# Print version from build.gradle for confirmation
$versionCode = (Select-String -Path "android\app\build.gradle" -Pattern "versionCode\s+(\d+)").Matches[0].Groups[1].Value
$versionName = (Select-String -Path "android\app\build.gradle" -Pattern 'versionName\s+"([^"]+)"').Matches[0].Groups[1].Value
Write-Host "  App Version: $versionName  (versionCode $versionCode)" -ForegroundColor Cyan
Write-Host ""

if ($OpenFolder) {
    Start-Process (Split-Path $aabFull -Parent)
}

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Play Console → Testing → Internal testing" -ForegroundColor Gray
Write-Host "  2. Create new release → Upload:  $aabFull" -ForegroundColor Gray
Write-Host "  3. Add release notes → Review → Rollout" -ForegroundColor Gray
Write-Host ""
