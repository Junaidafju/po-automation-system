# deploy_backend.ps1
Write-Host "🚀 Deploying PO Automation System Backend to Render.com" -ForegroundColor Green
Write-Host ""
Write-Host "Step 1: Navigate to https://dashboard.render.com" -ForegroundColor Yellow
Write-Host "Step 2: Click 'New +' → 'Web Service'" -ForegroundColor Yellow
Write-Host "Step 3: Select 'Deploy from GitHub' or 'Public Git Repository'" -ForegroundColor Yellow
Write-Host "Step 4: Use the following settings:" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  Name:              po-backend" -ForegroundColor White
Write-Host "  Environment:       Python" -ForegroundColor White
Write-Host "  Build Command:     pip install -r requirements.txt" -ForegroundColor White
Write-Host "  Start Command:     gunicorn main:app -k uvicorn.workers.UvicornWorker" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""
Write-Host "Step 5: Click 'Create Web Service'" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend will be live at: https://po-backend.onrender.com" -ForegroundColor Cyan