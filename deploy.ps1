param(
  [string]$Msg = "deploy"
)

$ErrorActionPreference = "Stop"

# Required environment variables
$RG    = $env:AZURE_RESOURCE_GROUP
$APP   = $env:AZURE_CONTAINER_APP
$ACR   = $env:AZURE_ACR_NAME
$IMAGE = $env:AZURE_IMAGE_NAME

# Check required env vars
$missing = @()
if (-not $RG)    { $missing += "AZURE_RESOURCE_GROUP" }
if (-not $APP)   { $missing += "AZURE_CONTAINER_APP" }
if (-not $ACR)   { $missing += "AZURE_ACR_NAME" }
if (-not $IMAGE) { $missing += "AZURE_IMAGE_NAME" }

if ($missing.Count -gt 0) {
  Write-Host "ERROR: Missing required environment variables:" -ForegroundColor Red
  foreach ($var in $missing) {
    Write-Host "  - $var" -ForegroundColor Red
  }
  Write-Host ""
  Write-Host "Set them in your shell before running:" -ForegroundColor Yellow
  Write-Host '  $env:AZURE_RESOURCE_GROUP = "rg-ipa-fresh"'
  Write-Host '  $env:AZURE_CONTAINER_APP = "ipa-fresh-frontend"'
  Write-Host '  $env:AZURE_ACR_NAME = "ipafreshacr1072"'
  Write-Host '  $env:AZURE_IMAGE_NAME = "ipa-fresh-frontend"'
  exit 1
}

# Verify Azure CLI is logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
  Write-Host "ERROR: Not logged into Azure CLI. Run 'az login' first." -ForegroundColor Red
  exit 1
}

Write-Host "=== Deploy starting ==="
Write-Host "Azure Account: $($account.name)"
Write-Host "Resource Group: $RG"
Write-Host "Container App: $APP"
Write-Host ""

# 0) Ensure we're in the repo root where Dockerfile exists
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1) Git commit + push (only if there are changes)
if (git status --porcelain) {
  Write-Host "Committing and pushing changes..."
  git add -A
  git commit -m $Msg
  git push
} else {
  Write-Host "Working tree clean - deploying anyway (build + update image)." -ForegroundColor Cyan
}

# 3) Build + push image to ACR with unique tag
$TAG = Get-Date -Format "yyyyMMddHHmmss"
$FULL_IMAGE = "$ACR.azurecr.io/$IMAGE`:$TAG"

Write-Host "Building image: $FULL_IMAGE"
az acr build -r $ACR -t $FULL_IMAGE .

# 4) Update Container App to new image
Write-Host "Updating Container App: $APP"
az containerapp update --name $APP --resource-group $RG --image $FULL_IMAGE | Out-Null

# 5) Force new revision & restart latest
Write-Host "Restarting latest revision..."
$latest = az containerapp show -g $RG -n $APP --query "properties.latestRevisionName" -o tsv
az containerapp revision restart -g $RG -n $APP --revision $latest | Out-Null

# 6) Show URL + image running
$FQDN = az containerapp show --name $APP --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv
$RUNNING = az containerapp show --name $APP --resource-group $RG --query "properties.template.containers[0].image" -o tsv

Write-Host ""
Write-Host "=== DEPLOYED ==="
Write-Host "Running image: $RUNNING"
Write-Host "URL: https://$FQDN/login?ts=$TAG"
Write-Host ""
