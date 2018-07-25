param($ArchId)

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot

try {
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
    if ($ArchId -eq $Id) {
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
        & $CMake --build . --config Release
        if ($LASTEXITCODE -ne 0) {
          exit 1
        }
        
        Write-Output "Assembling into SDK directory..."
        if (!(Test-Path $PSScriptRoot/sdk/$Id)) {
          New-Item -ItemType Directory -Path $PSScriptRoot/sdk/$Id
        }
        $Ext = ".dll"
        $TestExt = ".exe"
        $Pre = ""
        $Dir = "Release/"
        if ($global:IsMacOS) {
          $Ext = ".dylib"
          $TestExt = ""
          $Pre = "lib"
          $Dir = "bin/Release/"
        } elseif ($global:IsLinux) {
          $Ext = ".so"
          $TestExt = ""
          $Pre = "lib"
          $Dir = "bin/"
        }
        Copy-Item $PSScriptRoot/build_$Id/$Dir$($Pre)cchost$Ext $PSScriptRoot/sdk/$Id/$($Pre)cchost$Ext
        Copy-Item $PSScriptRoot/build_$Id/$($Dir)cctest$TestExt $PSScriptRoot/sdk/$Id/cctest$TestExt
        if ($global:IsMacOS -or $global:IsLinux) {
          Copy-Item $PSScriptRoot/build_$Id/$Dir$($Pre)steam_api$Ext $PSScriptRoot/sdk/$Id/$($Pre)steam_api$Ext
        } else {
          # These are only temporarily copied so we can run cctest twice on Windows, once with Steam API DLLs
          # present and again without them present, since we should be successfully be delay loading them.
          Copy-Item $PSScriptRoot/steam/win32/steam_api.dll $PSScriptRoot/sdk/$Id/steam_api.dll
          Copy-Item $PSScriptRoot/steam/win64/steam_api64.dll $PSScriptRoot/sdk/$Id/steam_api64.dll
        }

        $IsWsl32Bit = $global:IsLinux -and $Id -eq "Linux32" -and (Get-Content -Raw /proc/version).Contains("Microsoft");

        if (!$IsWsl32Bit) {
          Write-Output "Running tests in SDK directory..."
          Push-Location $PSScriptRoot/sdk/$Id/
          try {
            & .\cctest$TestExt
            if ($LastExitCode -ne 0) {
              Write-Error "Unable to run cctest successfully! Check the output above."
            }

            Write-Output "Successfully ran cctest with Steam API DLLs."

            if (!($global:IsMacOS -or $global:IsLinux)) {
              Write-Output "Removing Steam API DLLs from Windows for second test run..."
              Remove-Item -Force steam_api.dll
              Remove-Item -Force steam_api64.dll

              & .\cctest$TestExt
              if ($LastExitCode -ne 0) {
                Write-Error "Unable to run cctest successfully with no Steam API DLLs! Check the output above."
              }

              Write-Output "Successfully ran cctest without Steam API DLLs."
            } else {
              Write-Warning "The target platform does not support optional Steam API DLLs."
            }
          } finally {
            Write-Output "Removing test executable from SDK directory"
            Remove-Item -Force cctest$TestExt
            Pop-Location
          }
        } else {
          Write-Warning "Skipping execution of Client Connect tests because this is a 32-bit build on 64-bit WSL, which can't execute 32-bit programs.";
          Remove-Item -Force $PSScriptRoot/sdk/$Id/cctest$TestExt
        }
      } finally {
        Pop-Location
      }
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