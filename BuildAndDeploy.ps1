param($TargetLang = "UnrealEngine-4.19", $TargetDir = "C:\Users\jrhod\Documents\Projects\minute-of-mayhem-ue4-lfs\Plugins\HiveMPSDK")

if (Test-Path $TargetDir) {
  Remove-Item -Force -Recurse $TargetDir
}

Push-Location $PSScriptRoot

try {
  yarn
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }

  Push-Location $PSScriptRoot\client_connect\ccsrc
  try {
    yarn
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }

  yarn generate-client-connect
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }
} finally {
  Pop-Location
}