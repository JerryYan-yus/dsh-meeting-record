# One-click installer for Windows.
# Usage (PowerShell): powershell -ExecutionPolicy Bypass -File .\install.ps1 [-Profile name] [-DryRun]
param(
  [string]$Profile,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $dir 'scripts\install.mjs'
$arguments = @()
if ($Profile) { $arguments += @('--profile', $Profile) }
if ($DryRun) { $arguments += '--dry-run' }

function Find-Node {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($node) { return @{ File = $node.Source; IsElectron = $false } }
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\bin\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'DeepSeek Harness\resources\runtime\bin\node.exe'),
    (Join-Path $env:ProgramFiles 'DeepSeek Harness\resources\runtime\bin\node.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  foreach ($candidate in $candidates) {
    return @{ File = $candidate; IsElectron = $false }
  }
  $appCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\DeepSeek Harness.exe'),
    (Join-Path $env:LOCALAPPDATA 'DeepSeek Harness\DeepSeek Harness.exe'),
    (Join-Path $env:ProgramFiles 'DeepSeek Harness\DeepSeek Harness.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  foreach ($candidate in $appCandidates) {
    return @{ File = $candidate; IsElectron = $true }
  }
  return $null
}

$node = Find-Node
if ($null -eq $node) {
  Write-Host '安装失败：没有找到 node，也没有找到 DeepSeek Harness 可执行文件。' -ForegroundColor Red
  Write-Host '请先安装 Node.js，或设置 DSH_NODE 后重试。' -ForegroundColor Red
  exit 1
}

Write-Host "使用 Node：$($node.File)"
if ($node.IsElectron) {
  $env:ELECTRON_RUN_AS_NODE = '1'
  & $node.File --expose-internals $script @arguments
} else {
  & $node.File $script @arguments
}
exit $LASTEXITCODE
