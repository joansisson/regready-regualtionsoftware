$ErrorActionPreference = "Stop"

$candidates = @(
  "release/win-unpacked/RegReady Local Pro.exe",
  "release-build/win-unpacked/RegReady Local Pro.exe",
  "node_modules/electron/dist/electron.exe",
  "release/win-unpacked/resources/app.asar",
  "release-build/win-unpacked/resources/app.asar",
  "release/RegReady Local Pro Setup 1.0.0.exe"
)

$results = @()

foreach ($c in $candidates) {
  $isTracked = $false
  if ($null -ne (git ls-files -- $c)) {
    $isTracked = $true
  }

  $results += [PSCustomObject]@{
    Path = $c
    Tracked = $isTracked
  }
}

$results | Format-Table -AutoSize
