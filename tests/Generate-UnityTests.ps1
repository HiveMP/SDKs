#!/usr/bin/env pwsh
param([string] $Version = "5.4.1f", [string] $SdkVersion)

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Generate-Unity-Build() {
  for ($i=0; $i -lt 30; $i++) {
    try {
      Write-Output "Cleaning tests/UnityTest-$Version..."
      git clean -xdff "$PSScriptRoot\..\tests\UnityTest-$Version" 2>&1 | Out-Null;
      if ($LASTEXITCODE -eq 0) {
        break;
      }
    } catch {}
  }
  for ($i=0; $i -lt 30; $i++) {
    try {
      Write-Output "Checking out tests/UnityTest-$Version..."
      git checkout HEAD -- "$PSScriptRoot\..\tests\UnityTest-$Version" 2>&1 | Out-Null;
      if ($LASTEXITCODE -eq 0) {
        break;
      }
    } catch {}
  }
  
  Write-Output "Unpacking SDK package..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $sdkName = (Get-Item $PSScriptRoot\..\assets\Unity-SDK.$SdkVersion.zip).FullName;
  Write-Output $sdkName
  [System.IO.Compression.ZipFile]::ExtractToDirectory($sdkName, "$PSScriptRoot\..\tests\UnityTest-$Version\Assets\HiveMP");

  Write-Output "Copying build script..."
  Copy-Item -Force $PSScriptRoot\Build-UnityTest.ps1 "$PSScriptRoot\..\tests\UnityTest-$Version\Build-UnityTest.ps1"

  Write-Output "Copying licensing script..."
  Copy-Item -Force $PSScriptRoot\..\util\License-Unity.ps1 "$PSScriptRoot\..\tests\UnityTest-$Version\License-Unity.ps1"
}

Set-Location $PSScriptRoot\..

Generate-Unity-Build