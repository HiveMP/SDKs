#
# This utility script restores packages, generates and builds the Client Connect DLLs, and generates
# an SDK into the target folder. While the Jenkinsfile in this repository also does this (and runs
# tests), this script is a handy way to build and re-deploy the SDK from source to one of your own
# projects.
#

param($TargetLang = "UnrealEngine-4.19", $TargetDir = "C:\Users\jrhod\Documents\Projects\minute-of-mayhem-ue4-lfs\Plugins\HiveMPSDK")

if (Test-Path $TargetDir) {
  Remove-Item -Force -Recurse $TargetDir
}

Push-Location $PSScriptRoot

try {
  Write-Output "Restoring packages for SDK Generator..."
  yarn
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }

  Push-Location $PSScriptRoot\client_connect
  .\Build.ps1

  Write-Output "Generating target SDK into target folder..."
  yarn generator generate $TargetLang "$TargetDir"
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }
} finally {
  Pop-Location
}