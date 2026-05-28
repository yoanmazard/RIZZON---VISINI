$ErrorActionPreference = "Stop"

$projectRef = "qgnqgvwkgynmbxpyjtna"
$envFile = Join-Path $PSScriptRoot ".." ".env"
$envFile = Resolve-Path $envFile

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Connexion Supabase (navigateur)..."
  supabase login
}

Write-Host "Mise à jour auth (site URL, redirects, MFA TOTP)..."
node scripts/push-auth-config.mjs

Write-Host "Synchronisation config.toml distante..."
supabase config push --project-ref $projectRef --yes

Write-Host "Auth Supabase configuree."
