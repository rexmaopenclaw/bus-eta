# Bus ETA deploy script: syntax check -> git push -> wrangler deploy -> verify
param([string]$msg = "deploy")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

echo "=== 1. Syntax check ==="
node --check worker/index.js
if ($LASTEXITCODE -ne 0) { echo "SYNTAX FAIL"; exit 1 }
node --check worker/routes-data.js
if ($LASTEXITCODE -ne 0) { echo "SYNTAX FAIL"; exit 1 }
echo "Syntax OK"

echo "=== 2. Git commit + push ==="
git add -A
git commit -m $msg
git push
if ($LASTEXITCODE -ne 0) { echo "GIT PUSH FAIL"; exit 1 }

# Capture deployed commit hash + timestamp for version.json
$gitHash = git rev-parse --short HEAD
$timeStamp = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"

# Ensure dist/ exists (built by: npx expo export -p web)
if (-not (Test-Path "dist")) { echo "dist/ NOT FOUND — run npx expo export -p web first"; exit 1 }

# Write version.json into dist/ (ASCII-safe JSON via .NET, avoids PS5.1 UTF8 BOM issues)
$verJson = '{"version":"' + $gitHash + '","date":"' + $timeStamp + '"}'
[System.IO.File]::WriteAllText((Join-Path $root "dist\version.json"), $verJson)
echo "version.json: $verJson"

echo "=== 3. Deploy Cloudflare ==="
npx wrangler deploy
if ($LASTEXITCODE -ne 0) { echo "DEPLOY FAIL"; exit 1 }

echo "=== 4. Verify ==="
$code = (curl.exe -s -o NUL -w "%{http_code}" "https://bus-eta.rexmaopenclaw.workers.dev/")
echo "Site: $code"
if ($code -ne "200") { echo "VERIFY FAIL"; exit 1 }
echo "DONE! Live at https://bus-eta.rexmaopenclaw.workers.dev/"
