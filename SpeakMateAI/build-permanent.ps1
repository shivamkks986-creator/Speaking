# SpeakMate AI - One-Shot Permanent Build Script
# Run from D:\sm\SpeakMateAI: .\build-permanent.ps1
# This does EVERYTHING: prebuild, config, build, install

$ErrorActionPreference = "Continue"
$startTime = Get-Date

function Write-Step {
    param([string]$Msg)
    Write-Host ""
    Write-Host "==> $Msg" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Msg)
    Write-Host "    [OK] $Msg" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "    [WARN] $Msg" -ForegroundColor Yellow
}

# ==== STEP 0: Preflight checks ====
Write-Step "Preflight checks"
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Not in SpeakMateAI folder. cd D:\sm\SpeakMateAI first." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "speakmateai-release.jks")) {
    Write-Warn "speakmateai-release.jks not found - debug signing will be used"
}
Write-Ok "In correct folder: $(Get-Location)"

# ==== STEP 1: Kill stale processes ====
Write-Step "Killing stale Java/Kotlin/Gradle processes"
if (Test-Path "android\gradlew.bat") {
    & .\android\gradlew --stop -p android 2>$null
}
Get-Process java, kotlin*, studio64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Ok "Processes cleared"

# ==== STEP 2: Backup old android folder, regenerate ====
Write-Step "Backing up old android folder and running expo prebuild --clean"
if (Test-Path "android") {
    $backupName = "android-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Rename-Item "android" $backupName -Force
    Write-Ok "Old android folder backed up as $backupName"
}

& npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: expo prebuild failed" -ForegroundColor Red
    exit 1
}
Write-Ok "Fresh android folder generated"

# ==== STEP 3: Patch gradle.properties (memory + Kotlin in-process) ====
Write-Step "Patching gradle.properties"
$gradleProps = "android\gradle.properties"
Add-Content $gradleProps @"

# === SpeakMate AI build properties ===
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=1
kotlin.daemon.jvm.options=-Xmx2048m
kotlin.compiler.execution.strategy=in-process
kotlin.incremental=false
"@
Write-Ok "gradle.properties patched (4GB heap, in-process Kotlin)"

# ==== STEP 4: Patch app/build.gradle (lintOptions + keystore) ====
Write-Step "Patching app/build.gradle (lintOptions + signing)"
$appGradle = "android\app\build.gradle"
$content = Get-Content $appGradle -Raw

# Add lintOptions if missing
if ($content -notmatch "lintOptions") {
    $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1    lintOptions { abortOnError false; checkReleaseBuilds false }`n"
    Write-Ok "lintOptions block added"
}

# Wire keystore signing if keystore exists
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

        # Add signingConfigs.release block AND ensure release buildType uses it
        $content = $content -replace '(signingConfigs\s*\{[^}]*debug\s*\{[^}]+\}\s*)', "`$1`n        release {`n            if (keystorePropertiesFile.exists()) {`n                storeFile file(keystoreProperties['storeFile'])`n                storePassword keystoreProperties['storePassword']`n                keyAlias keystoreProperties['keyAlias']`n                keyPassword keystoreProperties['keyPassword']`n            }`n        }`n    "
        $content = $content -replace 'signingConfig signingConfigs\.debug(\s*\n[^}]*proguardFiles)', 'signingConfig signingConfigs.release$1'
        Write-Ok "Release signing config wired"
    }
}

Set-Content $appGradle -Value $content -NoNewline

# ==== STEP 5: Create keystore.properties if missing ====
$keystoreProps = "android\keystore.properties"
if ((Test-Path "speakmateai-release.jks") -and -not (Test-Path $keystoreProps)) {
    Write-Step "Creating keystore.properties (you'll be prompted for passwords)"
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

# ==== STEP 6: Build APK ====
Write-Step "Building release APK (this takes 10-20 min)"
Push-Location android
& .\gradlew assembleRelease --no-daemon --max-workers=1 -x lintVitalAnalyzeRelease
$buildExit = $LASTEXITCODE
Pop-Location

if ($buildExit -ne 0) {
    Write-Host "ERROR: APK build failed" -ForegroundColor Red
    exit $buildExit
}

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Ok "APK built: $apkPath ($apkSize MB)"
} else {
    Write-Host "ERROR: APK not found at $apkPath" -ForegroundColor Red
    exit 1
}

# ==== STEP 7: Install on connected device (optional) ====
Write-Step "Attempting to install on connected device"
$adbDevices = & adb devices 2>&1 | Select-String "device$"
if ($adbDevices) {
    & adb uninstall com.speakmate.ai 2>$null
    & adb install -r $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Installed on device. Open SpeakMate AI to test."
    }
} else {
    Write-Warn "No device connected. Manually transfer APK to phone:"
    Write-Host "    $apkPath" -ForegroundColor White
}

# ==== Done ====
$duration = (Get-Date) - $startTime
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  PERMANENT BUILD COMPLETE!" -ForegroundColor Green
Write-Host "  Total time: $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next time you want to update code:" -ForegroundColor Cyan
Write-Host "  For JS-only changes -> npx eas-cli update --branch production --message 'fix'" -ForegroundColor White
Write-Host "  For native changes  -> run this script again" -ForegroundColor White
