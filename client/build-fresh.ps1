# Fresh Build Script
Write-Host "Clearing build cache..." -ForegroundColor Yellow

# Remove dist folder if it exists
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
   Write-Host "✓ Removed dist folder" -ForegroundColor Green
}

# Remove Vite cache
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "✓ Removed Vite cache" -ForegroundColor Green
}

Write-Host "`nStarting fresh build..." -ForegroundColor Yellow
npm run build

Write-Host "`nBuild complete!" -ForegroundColor Green
