#!/usr/bin/env pwsh
param([string] $Version = "4.16", [switch] $NoCleanAndSdkUnpack, [string] $SdkVersion)

$global:ErrorActionPreference = "Stop"

$OriginalLocation = $(pwd)

trap {
  Write-Output $_
  cd $OriginalLocation
  exit 1
}

cd $PSScriptRoot\..

if (!$NoCleanAndSdkUnpack) {
  for ($i=0; $i -lt 30; $i++) {
    try {
      Write-Output "Cleaning tests/UnrealTest-$Version..."
      git clean -xdff "$PSScriptRoot\..\tests\UnrealTest-$Version" 2>&1 | Out-Null;
      if ($LASTEXITCODE -eq 0) {
        break;
      }
    } catch {}
  }
  for ($i=0; $i -lt 30; $i++) {
    try {
      Write-Output "Checking out tests/UnrealTest-$Version..."
      git checkout HEAD -- "$PSScriptRoot\..\tests\UnrealTest-$Version" 2>&1 | Out-Null;
      if ($LASTEXITCODE -eq 0) {
        break;
      }
    } catch {}
  }
  
  echo "Unpacking SDK package..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $sdkName = (Get-Item $PSScriptRoot\..\assets\UnrealEngine-$Version-SDK.$SdkVersion.zip).FullName;
  echo $sdkName
  Expand-Archive -Force -Path $sdkName -DestinationPath "$PSScriptRoot\..\tests\UnrealTest-$Version\Plugins\HiveMPSDK"

  echo "Copying build script..."
  Copy-Item -Force $PSScriptRoot\Build-UE4Test.ps1 "$PSScriptRoot\..\tests\UnrealTest-$Version\Build-UE4Test.ps1"
}

cd $OriginalLocation