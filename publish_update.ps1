<#
  Publish an update to every phone running the UK app. No email needed.

  Normal update (any change to index.html):
      .\publish_update.ps1 -Notes "Short description of what changed"

  The phones download it in the background and install it automatically the
  next time the app is opened. A banner also offers "Restart now".

  Only if you changed something NATIVE (a new Capacitor plugin, Android
  permissions, app icon, build.gradle), build a new APK first with the steps in
  UPDATES.md, then add -Apk. Phones will then show a "Download" banner, because
  Android always makes a person tap Install for a new APK.
      .\publish_update.ps1 -Notes "..." -Apk
  Since 2 Oct 2026 -Apk only RECOMMENDS the new APK (recommendedNativeVersion): phones
  that have not installed it yet keep receiving normal updates. Add -RequireApk only when
  the new web bundle cannot run without the new native code (minNativeVersion).
#>
param(
    [string]$Notes = "",
    [switch]$Apk,
    [switch]$BuildApk,  # build the APK here too (about 4 minutes); implies -Apk
    [switch]$RequireApk # the new bundle NEEDS the new APK (rare); without it the APK is only recommended
)
if ($BuildApk) { $Apk = $true }
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$version = Get-Date -Format "yyyy.MM.dd.HHmm"
$updDir  = Join-Path $PSScriptRoot "app-updates\uk"
$cfg     = Get-Content (Join-Path $updDir "config.json") -Raw | ConvertFrom-Json

Write-Host "== Publishing UK app update $version =="

# 1. Stamp the version into the app, so it knows which version it is running
$indexPath = Join-Path $PSScriptRoot "index.html"
$html = [IO.File]::ReadAllText($indexPath)
$stamped = [regex]::Replace($html, "const APP_BUNDLE_VERSION = '[^']*';", "const APP_BUNDLE_VERSION = '$version';")
if ($stamped -eq $html) { throw "Could not find APP_BUNDLE_VERSION in index.html" }
[IO.File]::WriteAllText($indexPath, $stamped, (New-Object System.Text.UTF8Encoding $false))

# 2. Build
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed. Nothing was published." }

# 2b. Optionally build the APK from this exact bundle, so both carry the same version
if ($BuildApk) {
    npx cap sync
    if ($LASTEXITCODE -ne 0) { throw "cap sync failed." }
    # Build from a copy OUTSIDE OneDrive: OneDrive turns freshly written files into
    # cloud placeholders that Gradle refuses to read ("not a regular file").
    $mirror = Join-Path $env:LOCALAPPDATA "SHGH-builds\uk-app-src"
    robocopy (Join-Path $PSScriptRoot "android") (Join-Path $mirror "android") /MIR /XD build .gradle /NFL /NDL /NJH /NJS /NP | Out-Null
    foreach ($pkg in @("@capacitor", "@capgo")) {
        $srcPkg = Join-Path $PSScriptRoot "node_modules\$pkg"
        if (Test-Path $srcPkg) { robocopy $srcPkg (Join-Path $mirror "node_modules\$pkg") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null }
    }
    $env:SHGH_SIGNING_PROPS = Join-Path (Split-Path $PSScriptRoot -Parent) "private-signing\signing.properties"
    Push-Location (Join-Path $mirror "android")
    .\gradlew assembleRelease --no-daemon
    $gradleExit = $LASTEXITCODE
    Pop-Location
    if ($gradleExit -ne 0) { throw "APK build failed. Nothing was published." }
    Copy-Item (Join-Path $env:LOCALAPPDATA "SHGH-builds\uk-app\app\outputs\apk\release\app-release.apk") (Join-Path $PSScriptRoot "uk-app-debug.apk") -Force
}

# 3. Package
$zipName = "bundle-$version.zip"
$zipPath = Join-Path $updDir $zipName
python (Join-Path $PSScriptRoot "app-updates\make_zip.py") (Join-Path $PSScriptRoot "dist") $zipPath
if ($LASTEXITCODE -ne 0) { throw "Packaging failed. Nothing was published." }
$sha = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLower()

# 4. Optional native APK
if ($Apk) {
    $built = Join-Path $PSScriptRoot "uk-app-debug.apk"
    if (-not (Test-Path $built)) { throw "No uk-app-debug.apk found. Build the APK first (see UPDATES.md)." }
    Copy-Item $built (Join-Path $updDir "uk-app.apk") -Force
    $gradle = Get-Content (Join-Path $PSScriptRoot "android\app\build.gradle") -Raw
    $m = [regex]::Match($gradle, 'versionName "([^"]+)"')
    if ($m.Success) {
        if ($RequireApk) { $cfg.minNativeVersion = $m.Groups[1].Value }
        $cfg | Add-Member -NotePropertyName recommendedNativeVersion -NotePropertyValue $m.Groups[1].Value -Force
        [IO.File]::WriteAllText((Join-Path $updDir "config.json"), ($cfg | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
    }
    Write-Host "APK published; phones below native $($cfg.recommendedNativeVersion) will be offered it (required below $($cfg.minNativeVersion))."
}

# 5. Manifest the phones read
$manifest = [ordered]@{
    version          = $version
    url              = "https://shgh-lms1.web.app/app-updates/uk/$zipName"
    checksum         = $sha
    notes            = $Notes
    minNativeVersion = $cfg.minNativeVersion
    recommendedNativeVersion = $cfg.recommendedNativeVersion
    apkUrl           = $cfg.apkUrl
    publishedAt      = (Get-Date).ToUniversalTime().ToString("o")
}
# Written WITHOUT a byte-order mark: PowerShell 5.1 adds one with -Encoding UTF8, and then cannot parse its own file.
[IO.File]::WriteAllText((Join-Path $updDir "latest.json"), ($manifest | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))

# 6. Keep only the 3 newest bundles online
Get-ChildItem $updDir -Filter "bundle-*.zip" | Sort-Object Name -Descending | Select-Object -Skip 3 | Remove-Item -Force

# 7. Deploy the web version and the update files together
firebase deploy --only hosting --project shgh-lms1
if ($LASTEXITCODE -ne 0) { throw "Deploy failed." }

# 8. Check the phones will actually see it. Hosting can take a few seconds to
#    serve a new release everywhere, so retry for up to 30 seconds before failing.
$live = $null
for ($i = 0; $i -lt 10; $i++) {
    try { $live = Invoke-RestMethod "https://shgh-lms1.web.app/app-updates/uk/latest.json?t=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" } catch { $live = $null }
    if ($live -and $live.version -eq $version) { break }
    Start-Sleep -Seconds 3
}
if (-not $live -or $live.version -ne $version) { throw "Deployed, but after 30 seconds the live manifest still says $($live.version), not $version." }
Write-Host ""
Write-Host "Done. Version $version is live. Phones will pick it up within 30 minutes of opening the app."
