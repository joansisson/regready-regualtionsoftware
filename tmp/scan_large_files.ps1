$ErrorActionPreference = "Stop"

$thresholdBytes = 90MB

Get-ChildItem -Path "." -Recurse -File -Force |
  Where-Object { $_.Length -gt $thresholdBytes } |
  ForEach-Object {
    [PSCustomObject]@{
      FullName = $_.FullName
      MB       = [math]::Round($_.Length / 1MB, 2)
      Bytes    = $_.Length
    }
  } |
  Sort-Object MB -Descending |
  Format-Table -AutoSize -Wrap
