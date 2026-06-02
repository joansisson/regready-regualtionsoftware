$ErrorActionPreference = "Stop"

$base = "http://localhost:5000"

function Invoke-Json {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter()][hashtable]$Headers,
    [Parameter()][object]$Body
  )

  $jsonBody = $null
  if ($null -ne $Body) {
    $jsonBody = ($Body | ConvertTo-Json -Depth 20)
  }

  $resp = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 30 `
    -ContentType "application/json" `
    -Headers ($Headers) `
    -Body $jsonBody

  $parsed = $null
  if ($resp.Content -and $resp.Content.Trim().Length -gt 0) {
    try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = $resp.Content }
  }

  return @{
    status = [int]$resp.StatusCode
    body = $parsed
    raw = $resp.Content
  }
}

Write-Host "Login as org2-smoke..."
$login = Invoke-Json -Method "POST" -Url ($base + "/api/auth/login") -Body @{
  email="org2-smoke@regready.local"
  password="placeholder-password"
  username="Org2 Smoke"
} -Headers @{}

if ($login.status -ne 200) { throw "Login failed status=$($login.status)" }
if (-not $login.body.token) { throw "Login token missing" }

$token = $login.body.token

Write-Host "Generate verified link..."
$gen = Invoke-Json -Method "POST" -Url ($base + "/api/verified-links/generate") -Headers @{
  Authorization = ("Bearer " + $token)
} -Body @{
  supplierName="Org2 Trusted Supplier"
  supplierDomain="example.com"
  industry="SaaS"
  companySize="50-200"
  badges=@("SOC 2 Ready")
  attachApprovedPolicies=$true
}

if ($gen.status -lt 200 -or $gen.status -ge 300) { throw "Generate link failed status=$($gen.status) raw=$($gen.raw)" }
if (-not $gen.body.token) { throw "Verified-link token missing" }

$linkToken = $gen.body.token
Write-Host "Trust center token=" $linkToken

Write-Host "Fetch trust-center payload (buyer-facing, token-only)..."
$tc = Invoke-Json -Method "GET" -Url ($base + "/api/trust-center/" + $linkToken) -Headers @{}

if ($tc.status -lt 200 -or $tc.status -ge 300) { throw "Trust center fetch failed status=$($tc.status) raw=$($tc.raw)" }

$docs = $tc.body.documents
$docCount = 0
if ($null -ne $docs) { $docCount = @($docs).Count }

Write-Host "Trust center documents count=" $docCount

if ($docCount -lt 1) { throw "Expected at least 1 document" }

$doc = $docs | Select-Object -First 1
if (-not $doc.url) { throw "Document url missing" }

Write-Host "Fetch attached policy doc via document URL..."
$out = "tmp/trust_center_policy_runtime_smoke.pdf"
if (Test-Path $out) { Remove-Item $out -Force }

$docUrl = $base + $doc.url
Write-Host "Doc URL=" $docUrl

$docRes = Invoke-WebRequest -Uri $docUrl -Method "GET" -UseBasicParsing -TimeoutSec 60 -OutFile $out

Write-Host ("OK token=" + $linkToken + " docCount=" + $docCount + " docStatus=" + [int]$docRes.StatusCode + " saved=" + $out)
exit 0
