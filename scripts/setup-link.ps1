$ErrorActionPreference = "Stop"

$projectRef = "qgnqgvwkgynmbxpyjtna"
$envFile = Join-Path $PSScriptRoot ".." ".env"
$envFile = Resolve-Path $envFile

if (-not (Test-Path $envFile)) {
  Write-Host "Fichier .env introuvable. Copiez .env.example vers .env d'abord."
  exit 1
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Item -Path "env:$name" -Value $value
  }
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Etape 1/3 : connexion Supabase (navigateur)..."
  supabase login
}

$dbPassword = ($env:DATABASE_URL -replace '^postgresql://postgres(?:\.[^:@]+)??:([^@]+)@.*$', '$1')
if (-not $dbPassword -or $dbPassword -eq $env:DATABASE_URL) {
  $dbPassword = ($env:DATABASE_URL -replace '^postgresql://postgres:([^@]+)@.*$', '$1')
}

Write-Host "Etape 2/3 : liaison du projet $projectRef..."
Set-Location (Join-Path $PSScriptRoot "..")
supabase link --project-ref $projectRef --password $dbPassword

Write-Host "Etape 3/3 : push migrations via pooler IPv4..."
npm run db:push

Write-Host "Projet lie et migrations poussees."
