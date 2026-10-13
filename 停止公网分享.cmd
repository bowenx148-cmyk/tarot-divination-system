@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-public-sharing.ps1"
pause
