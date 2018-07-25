param($ArchId = "Default")

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot

try {
  Push-Location $PSScriptRoot/ccsrc
  try {
    Write-Output "Restoring packages for Client Connect SDK..."
    yarn --ignore-engines --cache-folder cache_$ArchId
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}