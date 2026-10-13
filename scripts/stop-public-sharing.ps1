$ErrorActionPreference = 'Stop'
$taskState = Join-Path (Split-Path -Parent $PSScriptRoot) '.local'
$taskFile = Join-Path $taskState 'sharing-processes.json'
if (!(Test-Path -LiteralPath $taskFile)) { Write-Host 'No sharing process record.'; exit 0 }
$taskRecords = Get-Content -LiteralPath $taskFile -Raw | ConvertFrom-Json
foreach ($taskRecord in $taskRecords) {
  $taskProcess = Get-Process -Id $taskRecord.id -ErrorAction SilentlyContinue
  if ($taskProcess -and $taskProcess.StartTime -and $taskProcess.ProcessName -eq $taskRecord.name -and $taskProcess.StartTime.ToUniversalTime().Ticks -eq ([datetime]$taskRecord.started).ToUniversalTime().Ticks) { Stop-Process -Id $taskRecord.id -ErrorAction SilentlyContinue }
}
Write-Host 'Sharing stopped. Local development and your files were left intact.'
