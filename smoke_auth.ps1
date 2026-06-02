$body = @{ email='pro@regready.local'; password='placeholder-password'; username='Local Admin' } | ConvertTo-Json -Depth 10
$res = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/login' -Method Post -UseBasicParsing -ContentType 'application/json' -Body $body -TimeoutSec 10
$obj = $res.Content | ConvertFrom-Json
$token = $obj.token
if ([string]::IsNullOrWhiteSpace($token)) { 'NO_TOKEN' ; exit 1 }

$u = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/user' -Method Get -UseBasicParsing -TimeoutSec 10 -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
"LOGIN_OK=true USER_STATUS=$($u.StatusCode)"
