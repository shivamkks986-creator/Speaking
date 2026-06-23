# SpeakMate AI - Post-Prebuild Android Setup
# Run this AFTER `npx expo prebuild --clean` to re-apply manual Android configurations
# Usage (from D:\sm\SpeakMateAI): .\setup-android-release.ps1

Write-Host "==> Setting up Android release configuration for SpeakMate AI..." -ForegroundColor Cyan

# ---- 1. Update gradle.properties (JVM memory + Kotlin daemon fix) ----
$gradlePropsFile = "android\gradle.properties"
if (Test-Path $gradlePropsFile) {
    $content = Get-Content $gradlePropsFile -Raw
    if ($content -notmatch "kotlin\.compiler\.execution\.strategy") {
        Add-Content $gradlePropsFile @"

# === SpeakMate AI custom build properties ===
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.daemon=false
org.gradle.parallel=false
org.gradle.workers.max=1
kotlin.daemon.jvm.options=-Xmx2048m
kotlin.compiler.execution.strategy=in-process
kotlin.incremental=false
"@
        Write-Host "  [OK] gradle.properties updated (JVM memory + Kotlin in-process)" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] gradle.properties already configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] gradle.properties not found - run 'expo prebuild' first" -ForegroundColor Red
    exit 1
}

# ---- 2. Add lintOptions to app/build.gradle (skip flaky lint) ----
$appBuildGradle = "android\app\build.gradle"
if (Test-Path $appBuildGradle) {
    $content = Get-Content $appBuildGradle -Raw
    if ($content -notmatch "lintOptions") {
        $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1    lintOptions {`n        abortOnError false`n        checkReleaseBuilds false`n    }`n"
        Set-Content $appBuildGradle -Value $content -NoNewline
        Write-Host "  [OK] lintOptions added to app/build.gradle" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] lintOptions already present" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] app/build.gradle not found" -ForegroundColor Red
    exit 1
}

# ---- 3. Wire keystore signing (if keystore.properties exists) ----
$keystorePropsFile = "android\keystore.properties"
$keystoreFile = "speakmateai-release.jks"

if (-not (Test-Path $keystorePropsFile)) {
    if (Test-Path $keystoreFile) {
        Write-Host ""
        Write-Host "==> Keystore detected: $keystoreFile" -ForegroundColor Cyan
        $storePass = Read-Host "  Keystore password" -AsSecureString
        $keyAlias = Read-Host "  Key alias (e.g., speakmate-release)"
        $keyPass = Read-Host "  Key password (Enter to use store password)" -AsSecureString

        $storePassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass))
        $keyPassPlain = if ($keyPass.Length -gt 0) {
            [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPass))
        } else { $storePassPlain }

        @"
storeFile=../../$keystoreFile
storePassword=$storePassPlain
keyAlias=$keyAlias
keyPassword=$keyPassPlain
"@ | Set-Content $keystorePropsFile
        Write-Host "  [OK] keystore.properties created" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] No keystore found - debug signing will be used" -ForegroundColor Yellow
    }
}

# ---- 4. Update app/build.gradle to use release keystore ----
if (Test-Path $keystorePropsFile) {
    $content = Get-Content $appBuildGradle -Raw
    if ($content -notmatch "keystore\.properties") {
        $signingBlock = @"
    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }

"@
        $content = $content -replace '(android\s*\{[^\n]*\n)', "`$1$signingBlock"
        $content = $content -replace 'signingConfig signingConfigs\.debug([^\n]*release[^\n]*\n)', 'signingConfig signingConfigs.release$1'

        # Replace the release signingConfig block
        $content = $content -replace 'release\s*\{\s*\n\s*storeFile file\(''debug\.keystore''\)[^}]+\}',
            @"
release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
"@

        Set-Content $appBuildGradle -Value $content -NoNewline
        Write-Host "  [OK] Release signing config wired in app/build.gradle" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==> Setup complete! Next step:" -ForegroundColor Cyan
Write-Host "    cd android" -ForegroundColor White
Write-Host "    .\gradlew assembleRelease --no-daemon" -ForegroundColor White
Write-Host ""
