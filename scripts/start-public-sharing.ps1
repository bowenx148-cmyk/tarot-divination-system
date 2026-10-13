param([switch]$Build)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskState = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Force -Path $taskState | Out-Null
foreach ($taskPort in @(3001,3002)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue) { throw "Port $taskPort is busy. Stop the existing sharing session first." }
}
$env:TAROT_DIST_DIR = '.next-share'
if ($Build -or !(Test-Path '.next-share/BUILD_ID')) {
  $ErrorActionPreference = 'Continue'
  & npm.cmd run build
  $taskBuildExit = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($taskBuildExit -ne 0) { throw 'Production build failed.' }
}
$taskProcesses = @()
function Start-SharingProcess($taskName, $taskExecutable, $taskArguments) {
  $taskProcess = Start-Process -FilePath $taskExecutable -ArgumentList $taskArguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskState "$taskName.log") -RedirectStandardError (Join-Path $taskState "$taskName-error.log")
  [pscustomobject]@{ id=$taskProcess.Id; name=$taskProcess.ProcessName; started=$taskProcess.StartTime.ToUniversalTime().ToString('o') }
}
try {
  $taskNode = (Get-Command node.exe).Source
  $taskProcesses += Start-SharingProcess 'production' $taskNode @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3001')
  $taskProcesses += Start-SharingProcess 'proxy' $taskNode @('scripts/public-proxy.cjs')
  if (!(Test-Path (Join-Path $taskState 'ngrok-bin/ngrok.exe')) -or !(Test-Path (Join-Path $taskState 'ngrok-token.txt'))) { throw 'Missing private ngrok binary or token in .local.' }
  '' | Set-Content (Join-Path $taskState 'public-url.txt')
  $taskProcesses += Start-SharingProcess 'tunnel' $taskNode @('scripts/sharing-tunnel.cjs')
  $taskProcesses | ConvertTo-Json | Set-Content (Join-Path $taskState 'sharing-processes.json') -Encoding utf8
  $taskDeadline = [DateTime]::UtcNow.AddSeconds(60)
  while ([DateTime]::UtcNow -lt $taskDeadline) {
    Start-Sleep -Milliseconds 500
    $taskChildFile = Join-Path $taskState 'tunnel-child.json'
    if ((Test-Path $taskChildFile) -and $taskProcesses.Count -eq 3) {
      $taskChild = Get-Content $taskChildFile -Raw | ConvertFrom-Json
      if ($taskChild.parent -eq $taskProcesses[2].id) {
        $taskChildProcess = Get-Process -Id $taskChild.id -ErrorAction SilentlyContinue
        if ($taskChildProcess) {
          $taskProcesses += [pscustomobject]@{ id=$taskChildProcess.Id; name=$taskChildProcess.ProcessName; started=$taskChildProcess.StartTime.ToUniversalTime().ToString('o') }
          $taskProcesses | ConvertTo-Json | Set-Content (Join-Path $taskState 'sharing-processes.json') -Encoding utf8
        }
      }
    }
    $taskLog = Get-Content (Join-Path $taskState 'public-url.txt') -Raw -ErrorAction SilentlyContinue
    if ($taskLog -match '^https://[a-zA-Z0-9.-]+\.(?:ngrok-free\.(?:app|dev)|ngrok\.(?:app|dev|io))') {
      $taskUrl = $Matches[0]
      try { $taskResponse = Invoke-WebRequest "$taskUrl/api/health" -UseBasicParsing -Headers @{ 'ngrok-skip-browser-warning'='1' } -TimeoutSec 10 }
      catch { continue }
      if ($taskResponse.StatusCode -ne 200) { continue }
      Write-Host "Share this URL: $taskUrl"
      Write-Host 'Keep this computer online. Developer administration is only available on localhost.'
      exit 0
    }
  }
  throw 'No tunnel URL received. See .local/tunnel-error.log.'
} catch {
  $taskFailure = $_
  foreach ($taskRecord in $taskProcesses) {
    $taskProcess = Get-Process -Id $taskRecord.id -ErrorAction SilentlyContinue
    if ($taskProcess -and $taskProcess.StartTime -and $taskProcess.ProcessName -eq $taskRecord.name -and $taskProcess.StartTime.ToUniversalTime().Ticks -eq ([datetime]$taskRecord.started).ToUniversalTime().Ticks) { Stop-Process -Id $taskRecord.id -ErrorAction SilentlyContinue }
  }
  throw $taskFailure
}
