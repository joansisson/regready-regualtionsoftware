param(
  [string]$BaseUrl = "http://localhost:5000"
)

# Ensure Node resolution works (run from repo root where node_modules exists)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $RepoRoot

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

  $statusCode = -1
  $content = $null

  try {
    $resp = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 20 `
      -ContentType "application/json" `
      -Headers ($Headers) `
      -Body $jsonBody `
      -ErrorAction Stop

    $statusCode = [int]$resp.StatusCode
    $content = $resp.Content
  } catch {
    # For non-xx responses, Invoke-WebRequest throws. Extract status + body from exception response.
    $exc = $_
    $httpResp = $null

    try {
      $httpResp = $exc.Exception.Response
    } catch {
      $httpResp = $null
    }

    if ($null -ne $httpResp) {
      try {
        $statusCode = [int]$httpResp.StatusCode
      } catch {
        # keep default -1
      }

      try {
        $stream = $httpResp.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = $reader.ReadToEnd()
        }
      } catch {
        # keep content as $null
      }
    }
  }

  if ($null -eq $content) {
    return @{
      ok = $false
      status = $statusCode
      body = $null
      raw = $null
      error = "No response content"
    }
  }

  $parsed = $null
  if ($content.Trim().Length -gt 0) {
    try { $parsed = $content | ConvertFrom-Json } catch { $parsed = $content }
  }

  return @{
    ok = ($statusCode -ge 200 -and $statusCode -lt 300)
    status = $statusCode
    body = $parsed
    raw = $content
  }
}

$TokenCachePath = Join-Path $RepoRoot "tmp/smoke_tokens.json"

function Get-UnixSeconds {
  return [int][double]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01T00:00:00Z")).TotalSeconds
}

function Decode-JwtExpSeconds {
  param([Parameter(Mandatory=$true)][string]$Token)

  $parts = $Token.Split('.')
  if ($parts.Length -lt 2) { return $null }

  $payloadB64 = $parts[1].Replace('-', '+').Replace('_', '/')
  switch ($payloadB64.Length % 4) {
    2 { $payloadB64 += '==' }
    3 { $payloadB64 += '=' }
  }

  $bytes = [System.Convert]::FromBase64String($payloadB64)
  $json = [System.Text.Encoding]::UTF8.GetString($bytes)
  $obj = $json | ConvertFrom-Json
  return $obj.exp
}

function Login {
  param(
    [Parameter(Mandatory=$true)][string]$Email,
    [Parameter(Mandatory=$true)][string]$Password,
    [Parameter(Mandatory=$true)][string]$Username
  )

  $body = @{
    email = $Email
    password = $Password
    username = $Username
  }

  for ($attempt = 0; $attempt -lt 4; $attempt++) {
    $res = Invoke-Json -Method "POST" -Url ($BaseUrl + "/api/auth/login") -Body $body -Headers @{}

    if ($res.status -eq 200) {
      if ($null -eq $res.body -or $null -eq $res.body.token -or [string]::IsNullOrWhiteSpace($res.body.token)) {
        throw "Login OK response but token missing. body=$($res.raw)"
      }
      return $res.body.token
    }

    if ($res.status -eq 429) {
      # backoff but keep it short (tool timeout safety)
      $sleepSeconds = [int](1 + ($attempt * 2))
      Write-Host "Rate limited logging in for $Email (429). Sleeping $sleepSeconds seconds..."
      Start-Sleep -Seconds $sleepSeconds
      continue
    }

    throw "Login failed for $Email. status=$($res.status) body=$($res.raw)"
  }

  throw "Login failed for $Email after multiple retries due to rate limiting."
}

function Get-Or-LoginToken {
  param(
    [Parameter(Mandatory=$true)][string]$CacheKey,
    [Parameter(Mandatory=$true)][string]$Email,
    [Parameter(Mandatory=$true)][string]$Password,
    [Parameter(Mandatory=$true)][string]$Username
  )

  $cache = @{}
  if (Test-Path $TokenCachePath) {
    try {
      $raw = Get-Content -Raw -Path $TokenCachePath
      if ($raw -and $raw.Trim().Length -gt 0) {
        $cache = $raw | ConvertFrom-Json
      }
    } catch {
      $cache = @{}
    }
  }

  $cached = $null
  if ($null -ne $cache -and $cache.PSObject.Properties.Name -contains $CacheKey) {
    $cached = $cache.$CacheKey
  }

  if ($null -ne $cached -and $null -ne $cached.token -and -not [string]::IsNullOrWhiteSpace($cached.token)) {
    $exp = Decode-JwtExpSeconds -Token $cached.token
    if ($null -ne $exp) {
      $now = Get-UnixSeconds
      # refresh if exp is within next 60 seconds
      if (($exp - $now) -gt 60) {
        Write-Host "Using cached token for $CacheKey (exp=$exp, now=$now)"
        return $cached.token
      }
    }
  }

  Write-Host "No valid cached token for $CacheKey. Logging in..."
  $token = Login -Email $Email -Password $Password -Username $Username

  # save/update cache
  if (-not (Test-Path (Split-Path -Parent $TokenCachePath))) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $TokenCachePath) | Out-Null
  }

  $now = Get-UnixSeconds
  $exp = Decode-JwtExpSeconds -Token $token
  if ($null -eq $exp) { $exp = 0 }

  $cache | Add-Member -NotePropertyName $CacheKey -NotePropertyValue @{ token = $token; exp = $exp; cachedAt = $now } -Force
  $cacheJson = $cache | ConvertTo-Json -Depth 10
  Set-Content -Path $TokenCachePath -Value $cacheJson -Encoding UTF8

  return $token
}

function Assert-Status {
  param(
    [Parameter(Mandatory=$true)][int]$Expected,
    [Parameter(Mandatory=$true)]$Actual,
    [Parameter(Mandatory=$true)][string]$Label
  )

  if ($Actual -ne $Expected) {
    throw "${Label}: expected status $Expected but got $Actual"
  }
}

# --- Seed org2/org3 data (cross-org + empty-table behavior) ---
Write-Host "Seeding org2/org3 test data..."
& node tmp/seed_cross_org.cjs | Out-Host

# --- Login for org2/org3 only (avoid org1 auth rate limiting) ---
$tokenOrg2 = Get-Or-LoginToken -CacheKey "org2" -Email "org2-smoke@regready.local" -Password "placeholder-password" -Username "Org2 Smoke"
$tokenOrg3 = Get-Or-LoginToken -CacheKey "org3" -Email "org3-smoke@regready.local" -Password "placeholder-password" -Username "Org3 Smoke"

$org2Headers = @{ Authorization = "Bearer $tokenOrg2" }
$org3Headers = @{ Authorization = "Bearer $tokenOrg3" }

# Fetch org2 policy id by title (for cross-org denial)
Write-Host "Locating org2 policy id..."
$org2Policies = (Invoke-Json -Method "GET" -Url ($BaseUrl + "/api/policies") -Headers $org2Headers).body
if ($null -eq $org2Policies) { throw "Expected org2 policies array but got null" }

$org2Policy = $org2Policies | Where-Object { $_.title -eq "Org2 CrossOrg Denial Policy" } | Select-Object -First 1
if ($null -eq $org2Policy) {
  Write-Host "WARN: Did not find seeded org2 policy by title. Titles returned:"
  $org2Policies | ForEach-Object { Write-Host (" - " + $_.title) }
  if ($org2Policies.Count -gt 0) {
    $org2Policy = $org2Policies | Select-Object -First 1
    Write-Host "Falling back to first org2 policy title='$($org2Policy.title)' id='$($org2Policy.id)'"
  } else {
    throw "Did not find any policies for org2; cannot run cross-org denial test."
  }
}
$org2PolicyId = [int]$org2Policy.id
Write-Host "Org2 policy id = $org2PolicyId"

# --- 1) Unauthenticated auth failure paths (expect 401) ---
Write-Host "Testing unauthenticated endpoints return 401..."

$unauthChecks = @(
  @{ label="GET /api/dashboard/metrics"; url="/api/dashboard/metrics" },
  @{ label="GET /api/dashboard/analytics"; url="/api/dashboard/analytics" },
  @{ label="GET /api/vendors"; url="/api/vendors" },
  @{ label="GET /api/team/members"; url="/api/team/members" },
  @{ label="GET /api/workspace/activities"; url="/api/workspace/activities" }
)

foreach ($c in $unauthChecks) {
  $r = Invoke-Json -Method "GET" -Url ($BaseUrl + $c.url) -Headers @{}
  Assert-Status -Expected 401 -Actual $r.status -Label $c.label
}

# Malformed token should also be 401
Write-Host "Testing malformed token returns 401..."
$rBadToken = Invoke-Json -Method "GET" -Url ($BaseUrl + "/api/auth/user") -Headers @{ Authorization = "Bearer not-a-jwt" }
Assert-Status -Expected 401 -Actual $rBadToken.status -Label "GET /api/auth/user with malformed token"

# --- 2) Invalid payloads (expect 400 validation) ---
Write-Host "Testing invalid payloads return 400..."

# /api/policies/generate requires title/type/description/frameworks types.
$invalidPayload = @{
  title = ""
  type = "general"
  description = "ok"
  frameworks = "gdpr"  # should be array
}
$rInvalid = Invoke-Json -Method "POST" -Url ($BaseUrl + "/api/policies/generate") -Headers $org3Headers -Body $invalidPayload
Assert-Status -Expected 400 -Actual $rInvalid.status -Label "POST /api/policies/generate invalid payload"

# /api/user/settings/api-key should require apiKey min(1)
$rInvalidKey = Invoke-Json -Method "POST" -Url ($BaseUrl + "/api/user/settings/api-key") -Headers $org3Headers -Body @{}
Assert-Status -Expected 400 -Actual $rInvalidKey.status -Label "POST /api/user/settings/api-key missing apiKey"

# --- 3) Empty table behavior (org3 has no policies/risk/audit seeded) ---
Write-Host "Testing empty-table behavior for org3..."

$rPoliciesOrg3 = Invoke-Json -Method "GET" -Url ($BaseUrl + "/api/policies") -Headers $org3Headers
Assert-Status -Expected 200 -Actual $rPoliciesOrg3.status -Label "GET /api/policies (org3)"
if ($null -eq $rPoliciesOrg3.body) { throw "Expected policies array for org3 but got null" }
if (($rPoliciesOrg3.body | Measure-Object).Count -ne 0) {
  Write-Host "WARN: org3 policies not empty; proceeding with analytics empty-table assertions anyway."
}

$rAnalyticsOrg3 = Invoke-Json -Method "GET" -Url ($BaseUrl + "/api/dashboard/analytics") -Headers $org3Headers
Assert-Status -Expected 200 -Actual $rAnalyticsOrg3.status -Label "GET /api/dashboard/analytics (org3)"
if ($null -eq $rAnalyticsOrg3.body) { throw "Expected analytics JSON but got null" }

# Should not crash and should include totals = 0-ish when empty
$policyMetrics = $rAnalyticsOrg3.body.policyMetrics
if ($null -eq $policyMetrics) { throw "Expected policyMetrics in analytics response" }
if ([int]$policyMetrics.total -lt 0) { throw "Invalid policyMetrics.total value" }

# --- 4) Cross-org denial: org1 must not access org2 policy ---
Write-Host "Testing cross-org denial..."

$rCrossOrg = Invoke-Json -Method "GET" -Url ($BaseUrl + "/api/policies/" + $org2PolicyId.ToString()) -Headers $org3Headers
Assert-Status -Expected 404 -Actual $rCrossOrg.status -Label "GET /api/policies/:id cross-org read denial"

Write-Host "smoke_endpoints.ps1: PASS"
exit 0
