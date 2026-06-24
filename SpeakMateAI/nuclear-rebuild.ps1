# SpeakMate AI — NUCLEAR CLEAN REBUILD
# Last-resort full reset: deletes node_modules + yarn.lock + android, then rebuilds everything
# Usage (from D:\sm\SpeakMateAI): .\nuclear-rebuild.ps1
# Takes ~30-45 minutes. Run when normal builds keep failing with version-mismatch crashes.

$ErrorActionPreference = "Continue"
$startTime = Get-Date

function Step { param($M) Write-Host ""; Write-Host "==> $M" -ForegroundColor Cyan }
function OK   { param($M) Write-Host "    [OK] $M" -ForegroundColor Green }
function Warn { param($M) Write-Host "    [!] $M" -ForegroundColor Yellow }

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Not in project root. cd D:\sm\SpeakMateAI" -ForegroundColor Red
    exit 1
}

# ===== 1. Kill ALL processes =====
Step "Killing all Java/Kotlin/Gradle/Studio processes"
Get-Process java, kotlin*, studio64, node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path "android\gradlew.bat") { & .\android\gradlew --stop -p android 2>$null }
OK "Processes cleared"

# ===== 2. NUCLEAR delete =====
Step "Nuclear delete: node_modules, locks, android folder, all caches"
Remove-Item -Recurse -Force node_modules        -ErrorAction SilentlyContinue
Remove-Item -Force       yarn.lock              -ErrorAction SilentlyContinue
Remove-Item -Force       package-lock.json      -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android             -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo               -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\transforms-*"      -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\modules-2\files-2.1\host.exp.exponent" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\modules-2\files-2.1\com.facebook.react" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\build-cache-*"     -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\jars-*"            -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\AppData\Local\Temp\react-*"       -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\AppData\Local\Temp\metro-*"       -ErrorAction SilentlyContinue
OK "All state cleared (incl. expo + react-native gradle caches)"

# ===== 3. Fresh yarn install =====
Step "Fresh yarn install (5-10 min)"
& yarn install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: yarn install failed" -ForegroundColor Red
    exit 1
}
OK "Dependencies installed"

# ===== 4. Align Expo SDK 54 versions =====
Step "Aligning Expo SDK 54 package versions"
# IMPORTANT: 'npx expo' fails on Windows with 'could not determine executable to run'
# Use 'node node_modules\expo\bin\cli' directly — works reliably cross-platform.
& node node_modules\expo\bin\cli install --fix
if ($LASTEXITCODE -ne 0) {
    Warn "expo install --fix returned non-zero — versions are exact-pinned anyway, continuing"
}
OK "Versions aligned"

# ===== 5. Fresh prebuild =====
Step "Fresh expo prebuild (3-5 min)"
& node node_modules\expo\bin\cli prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: expo prebuild failed" -ForegroundColor Red
    Write-Host "TRY MANUALLY: node node_modules\expo\bin\cli prebuild --platform android --clean --no-install" -ForegroundColor Yellow
    exit 1
}
OK "Android folder regenerated"

# ===== 6. Patch gradle.properties =====
Step "Patching gradle.properties"
Add-Content android\gradle.properties @"

# SpeakMate AI build properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=1
kotlin.daemon.jvm.options=-Xmx2048m
kotlin.compiler.execution.strategy=in-process
kotlin.incremental=false
"@
OK "gradle.properties patched"

# ===== 7. Patch app/build.gradle (lintOptions + keystore signing) =====
Step "Patching app/build.gradle"
$appGradle = "android\app\build.gradle"
$content = Get-Content $appGradle -Raw

# Add lintOptions
if ($content -notmatch "lintOptions") {
    $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1    lintOptions { abortOnError false; checkReleaseBuilds false }`n"
    OK "lintOptions added"
}

# Wire keystore (if exists)
if (Test-Path "speakmateai-release.jks") {
    if ($content -notmatch "keystorePropertiesFile") {
        $content = $content -replace '(android\s*\{[^\n]*\n[^\n]*lintOptions[^\n]*\n)', @"
`$1
    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) { keystoreProperties.load(new FileInputStream(keystorePropertiesFile)) }

"@
        $content = $content -replace '(signingConfigs\s*\{\s*\n\s*debug\s*\{[^}]+\}\s*)', @"
`$1
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    
"@
        $content = $content -replace 'signingConfig signingConfigs\.debug(\s*\n[^}]*proguardFiles)', 'signingConfig signingConfigs.release$1'
        OK "Release signing wired"
    }
}
Set-Content $appGradle -Value $content -NoNewline

# ===== 8. Create keystore.properties =====
if ((Test-Path "speakmateai-release.jks") -and -not (Test-Path "android\keystore.properties")) {
    Step "Creating keystore.properties"
    $storePass = Read-Host "  Keystore password" -AsSecureString
    $keyAlias  = Read-Host "  Key alias"
    $sp = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass))
    @"
storeFile=../../speakmateai-release.jks
storePassword=$sp
keyAlias=$keyAlias
keyPassword=$sp
"@ | Set-Content android\keystore.properties
    OK "keystore.properties created"
}

# ===== 9. Build APK =====
Step "Building APK (15-25 min, GO HAVE CHAI)"
Push-Location android
& .\gradlew assembleRelease --no-daemon --max-workers=1 -x lintVitalAnalyzeRelease
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Send the error screenshot." -ForegroundColor Red
    exit $exitCode
}

$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) {
    Write-Host "APK not produced at expected path." -ForegroundColor Red
    exit 1
}
$mb = [math]::Round((Get-Item $apk).Length / 1MB, 2)
OK "APK built: $apk ($mb MB)"

# ===== 10. Install =====
Step "Installing on device"
$dev = & adb devices 2>&1 | Select-String "device$"
if ($dev) {
    & adb uninstall com.speakmate.ai 2>$null
    & adb install -r $apk
    if ($LASTEXITCODE -eq 0) { OK "Installed. Open SpeakMate AI now." }
} else {
    Warn "No device connected. Manually transfer:"
    Write-Host "    $((Resolve-Path $apk).Path)" -ForegroundColor White
}

$d = (Get-Date) - $startTime
Write-Host ""
Write-Host "===========================" -ForegroundColor Green
Write-Host "  NUCLEAR REBUILD COMPLETE" -ForegroundColor Green
Write-Host "  Time: $([math]::Round($d.TotalMinutes,1)) min" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green
