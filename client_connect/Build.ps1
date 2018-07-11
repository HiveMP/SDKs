#
# This utility script restores packages, generates and builds the Client Connect DLLs, and generates
# an SDK into the target folder. While the Jenkinsfile in this repository also does this (and runs
# tests), this script is a handy way to build and re-deploy the SDK from source to one of your own
# projects.
#

param()

Push-Location $PSScriptRoot

try {
  Push-Location $PSScriptRoot\ccsrc
  try {
    Write-Output "Restoring packages for Client Connect SDK..."
    yarn --ignore-engines
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }

  Write-Output "Creating CMake build directory for Client Connect..."
  if (!(Test-Path $PSScriptRoot\build)) {
    mkdir $PSScriptRoot\build
  }

  $CMake = (Find-Command cmake)
  if ($env:OS -eq "Windows_NT" -and $CMake -eq $null) {
    $CMake = "C:\PROGRAM FILES (X86)\MICROSOFT VISUAL STUDIO\2017\ENTERPRISE\COMMON7\IDE\COMMONEXTENSIONS\MICROSOFT\CMAKE\CMake\bin\cmake.exe";
  }

  if ($CMake -eq $null -or $CMake -eq "") {
    Write-Error "CMake is not installed!"
  }

  Push-Location $PSScriptRoot\build
  try {
    Write-Output "Generating Client Connect solution with CMake..."
    if ($env:OS -eq "Windows_NT") {
      & $CMake -G "Visual Studio 15 2017" ..
    } else {
      & $CMake -G "Unix Makefiles" ..
    }
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
} finally {
  Pop-Location
}