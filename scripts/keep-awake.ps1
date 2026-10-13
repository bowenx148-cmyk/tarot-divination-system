$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class TarotAwake {
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern uint SetThreadExecutionState(uint flags);
}
'@
$deadline = [DateTimeOffset]::Parse('2026-10-09T12:00:00+08:00')
try {
  if ([TarotAwake]::SetThreadExecutionState([uint32]2147483651) -eq 0) { throw 'Unable to request display wake lock' }
  "Wake lock active until $deadline" | Set-Content -LiteralPath "$PSScriptRoot/keep-awake.status"
  while ([DateTimeOffset]::Now -lt $deadline) { Start-Sleep -Seconds 30 }
} finally {
  [void][TarotAwake]::SetThreadExecutionState([uint32]2147483648)
  'Wake lock released' | Set-Content -LiteralPath "$PSScriptRoot/keep-awake.status"
}
