$ErrorActionPreference = "Stop"

$projectRef = "qgnqgvwkgynmbxpyjtna"
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $rootDir ".env"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

Set-Location $rootDir

function Test-SupabaseCliAuth {
  $output = supabase projects list 2>&1 | Out-String
  return ($LASTEXITCODE -eq 0 -and $output -match 'REFERENCE ID')
}

if (-not (Test-SupabaseCliAuth)) {
  Write-Host "Connexion Supabase (navigateur)..."
  supabase login
}

if (-not (Test-Path (Join-Path $rootDir "supabase\.temp\project-ref"))) {
  Write-Host "Liaison du projet $projectRef..."
  $dbPassword = ($env:DATABASE_URL -replace '^postgresql://postgres(?:\.[^:@]+)??:([^@]+)@.*$', '$1')
  if (-not $dbPassword -or $dbPassword -eq $env:DATABASE_URL) {
    $dbPassword = ($env:DATABASE_URL -replace '^postgresql://postgres:([^@]+)@.*$', '$1')
  }
  supabase link --project-ref $projectRef --password $dbPassword
}

Write-Host "Mise a jour auth (site URL, redirects, MFA TOTP)..."
node scripts/push-auth-config.mjs

Write-Host "Synchronisation config.toml distante..."
supabase config push --project-ref $projectRef --yes

Write-Host "Auth Supabase configuree."
