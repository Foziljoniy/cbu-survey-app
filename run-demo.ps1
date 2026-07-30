$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableNodeDirectory = Join-Path (Split-Path -Parent $projectDirectory) ".tools\node-v24.18.0-win-x64"
$nodeExecutable = Join-Path $portableNodeDirectory "node.exe"
$npmCli = Join-Path $portableNodeDirectory "node_modules\npm\bin\npm-cli.js"

if (-not (Test-Path $nodeExecutable) -or -not (Test-Path $npmCli)) {
    Write-Error "The portable Node.js runtime was not found in $portableNodeDirectory."
}

$env:Path = "$portableNodeDirectory;$env:Path"
Set-Location $projectDirectory

if (-not (Test-Path "node_modules\vinext\package.json")) {
    Write-Host "Installing project dependencies. This is required only the first time..." -ForegroundColor Cyan
    & $nodeExecutable $npmCli install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "Dependency installation failed. Check the internet connection and run this script again."
    }
}

Write-Host "Starting the CBU Bank Lending Survey demo..." -ForegroundColor Green
Write-Host "Keep this window open while using the demo. Press Ctrl+C to stop it." -ForegroundColor DarkGray
& $nodeExecutable $npmCli run dev
