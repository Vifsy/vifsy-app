$ErrorActionPreference = "Stop"
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = Read-Host "Sökväg till din befintliga Spreelo 143.80-mapp"
if (-not (Test-Path $Target)) { throw "Mappen finns inte: $Target" }
Get-ChildItem -Path $PatchRoot -Force | Where-Object { $_.Name -notin @('APPLY_V143_81.ps1') } | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
}
Write-Host "v143.81-filerna är inlagda. Kör spreelo-v143.81-SQL.sql i Supabase innan deploy." -ForegroundColor Green
