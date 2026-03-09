# 一键部署 Firestore 与 Storage 规则
# 使用前请先运行一次: npx firebase-tools login （在浏览器中完成登录）
# 并确保 firebase-config.js 里已填写真实的 projectId

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$configPath = "firebase-config.js"
if (-not (Test-Path $configPath)) {
    Write-Host "firebase-config.js not found" -ForegroundColor Red
    exit 1
}

$content = Get-Content $configPath -Raw
if ($content -match 'projectId:\s*"([^"]+)"') {
    $projectId = $Matches[1]
} else {
    Write-Host "Cannot read projectId from firebase-config.js" -ForegroundColor Red
    exit 1
}

if ($projectId -eq "YOUR_PROJECT_ID") {
    Write-Host "Please set real projectId in firebase-config.js (replace YOUR_PROJECT_ID)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using project: $projectId" -ForegroundColor Cyan
Write-Host "Linking project and deploying rules..." -ForegroundColor Cyan

npx --yes firebase-tools use $projectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "Link failed. Run: npx firebase-tools login" -ForegroundColor Red
    exit 1
}

npx --yes firebase-tools deploy --only firestore,storage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed" -ForegroundColor Red
    exit 1
}

Write-Host "Done. Firestore and Storage rules deployed." -ForegroundColor Green
