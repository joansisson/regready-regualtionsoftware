$tokens = Get-Content -Raw -Path 'tmp/smoke_tokens.json' | ConvertFrom-Json
if (-not $tokens.org2.token) { throw "Missing org2.token in tmp/smoke_tokens.json" }
$token = $tokens.org2.token

Write-Output ("TOKEN_PREFIX=" + $token.Substring(0, 12))

$headers = @{ Authorization = ("Bearer " + $token) }

try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/dashboard/metrics' -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 20
  Write-Output ("STATUS=" + [int]$r.StatusCode)
  Write-Output ("BODY=" + $r.Content)
} catch {
  $resp = $_.Exception.Response
  if ($null -ne $resp) {
    Write-Output ("STATUS=" + [int]$resp.StatusCode)
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output ("BODY=" + $sr.ReadToEnd())
  } else {
    throw
  }
}
