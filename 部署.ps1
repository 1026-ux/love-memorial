# Push to GitHub (Vercel will auto-deploy)
# Run when you have network. If it fails, try again later or use another network.
Set-Location $PSScriptRoot
git add -A
$status = git status --short
if ($status) {
  git commit -m "update"
  git push origin main
  if ($LASTEXITCODE -eq 0) { Write-Host "Push OK. Wait 1-2 min for Vercel to deploy." } else { Write-Host "Push failed (network?). Try again later." }
} else {
  Write-Host "Nothing to commit. To push existing commits: git push origin main"
}
