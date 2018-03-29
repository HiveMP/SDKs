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

  Push-Location $PSScriptRoot\client_connect\ccsrc
  try {
    Write-Output "Restoring packages for Client Connect SDK..."
    yarn
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }

  Write-Output "Creating CMake build directory for Client Connect..."
  if (!(Test-Path $PSScriptRoot\client_connect\build)) {
    mkdir $PSScriptRoot\client_connect\build
  }

  $CMake = (Find-Command cmake)
  if ($CMake -eq $null) {
    $CMake = "C:\PROGRAM FILES (X86)\MICROSOFT VISUAL STUDIO\2017\ENTERPRISE\COMMON7\IDE\COMMONEXTENSIONS\MICROSOFT\CMAKE\CMake\bin\cmake.exe";
  }

  Push-Location $PSScriptRoot\client_connect\build
  try {
    Write-Output "Generating Client Connect solution with CMake..."
    & $CMake -G "Visual Studio 15 2017" ..
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }

    Write-Output "Building Client Connect solution with CMake..."
    & $CMake --build .
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }

  Write-Output "Generating target SDK into target folder..."
  yarn generator generate $TargetLang "$TargetDir"
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }
} finally {
  Pop-Location
}