#
# This utility script restores packages, generates and builds the Client Connect DLLs.
#

param()

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot

try {
  Push-Location $PSScriptRoot/ccsrc
  try {
    Write-Output "Restoring packages for Client Connect SDK..."
    yarn --ignore-engines
    if ($LASTEXITCODE -ne 0) {
      exit 1
    }
  } finally {
    Pop-Location
  }

  if ($env:OS -eq "Windows_NT") {
    $CMake = (Find-Command cmake)
    if ($CMake -eq $null) {
      $CMake = "C:\PROGRAM FILES (X86)\MICROSOFT VISUAL STUDIO\2017\ENTERPRISE\COMMON7\IDE\COMMONEXTENSIONS\MICROSOFT\CMAKE\CMake\bin\cmake.exe";
      if (!(Test-Path $CMake)) {
        $CMake = "C:\PROGRAM FILES (X86)\MICROSOFT VISUAL STUDIO\2017\COMMUNITY\COMMON7\IDE\COMMONEXTENSIONS\MICROSOFT\CMAKE\CMake\bin\cmake.exe";
        if (!(Test-Path $CMake)) {
          $CMake = $null
        }
      }
    }
  } else {
    $CMake = (which cmake)
  }

  if ($CMake -eq $null -or $CMake -eq "") {
    Write-Error "CMake is not installed!"
  }

  function Build-With-Target($Id, $Target, $CMakeArgs) {
    Write-Output "Building for $Target..."
    if (!(Test-Path $PSScriptRoot/build_$Id)) {
      New-Item -ItemType Directory -Path $PSScriptRoot/build_$Id
    }
    Push-Location $PSScriptRoot/build_$Id
    try {
      Write-Output "Generating Client Connect solution with CMake..."
      & $CMake $CMakeArgs ..
      if ($LASTEXITCODE -ne 0) {
        exit 1
      }

      Write-Output "Building Client Connect solution with CMake..."
      & $CMake --build .
      if ($LASTEXITCODE -ne 0) {
        exit 1
      }

      Write-Output "Assembling into SDK directory..."
      if (!(Test-Path $PSScriptRoot/sdk/$Id)) {
        New-Item -ItemType Directory -Path $PSScriptRoot/sdk/$Id
      }
      $Ext = ".dll"
      $Pre = ""
      $Dir = ""
      if ($global:IsMacOS) {
        $Ext = ".dylib"
        $Pre = "lib"
        $Dir = "bin/"
      } elseif ($global:IsLinux) {
        $Ext = ".so"
        $Pre = "lib"
        $Dir = "bin/"
      }
      Copy-Item $PSScriptRoot/build_$Id/$Dir$($Pre)cchost$Ext $PSScriptRoot/sdk/$Id/$($Pre)cchost$Ext
      Copy-Item $PSScriptRoot/build_$Id/$Dir$($Pre)curl$Ext $PSScriptRoot/sdk/$Id/$($Pre)curl$Ext
    } finally {
      Pop-Location
    }
  }

  if ($env:OS -eq "Windows_NT") {
    Build-With-Target "Win32" "Windows/32-bit" @("-G", "Visual Studio 15 2017")
    Build-With-Target "Win64" "Windows/64-bit" @("-G", "Visual Studio 15 2017 Win64")
  } elseif ($global:IsMacOS) {
    Build-With-Target "Mac64" "macOS/64-bit" @("-G", "Xcode", "-D", "CMAKE_OSX_ARCHITECTURES=x86_64", "-D", "OPENSSL_INCLUDE_DIR=/usr/local/opt/openssl/include")
  } elseif ($global:IsLinux) {
    Build-With-Target "Linux32" "Linux/32-bit" @("-G", "Unix Makefiles", "-D", "CMAKE_BUILD_TYPE=Release", "-D", "CMAKE_TOOLCHAIN_FILE=../toolchain/Linux-i386.cmake")
    Build-With-Target "Linux64" "Linux/64-bit" @("-G", "Unix Makefiles", "-D", "CMAKE_BUILD_TYPE=Release", "-D", "CMAKE_TOOLCHAIN_FILE=../toolchain/Linux-x86_64.cmake")
  }
} finally {
  Pop-Location
}