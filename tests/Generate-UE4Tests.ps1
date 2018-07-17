#!/usr/bin/env pwsh
param([string] $Version = "4.16", [switch] $NoCleanAndSdkUnpack)

$global:ErrorActionPreference = "Stop"

$OriginalLocation = $(pwd)

trap {
  Write-Output $_
  cd $OriginalLocation
  exit 1
}

cd $PSScriptRoot\..

if (!$NoCleanAndSdkUnpack) {
  echo "Cleaning tests/UnrealBuilds-$Version..."
  for ($i=0; $i -lt 30; $i++) {
    try {
      git clean -xdff "$TestPath";
      break;
    } catch {}
  }
  for ($i=0; $i -lt 30; $i++) {
    try {
      git checkout HEAD -- "$TestPath";
      break;
    } catch {}
  }
  
  echo "Unpacking SDK package..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $sdkName = (Get-Item $PSScriptRoot\..\UnrealEngine-$Version-SDK*.zip).FullName;
  echo $sdkName
  [System.IO.Compression.ZipFile]::ExtractToDirectory($sdkName, "$TestPath\Plugins\HiveMPSDK");

  echo "Copying build script..."
  Copy-Item -Force $PSScriptRoot\Build-UE4Test.ps1 "$TestPath\Build-UE4Test.ps1"
}

cd $OriginalLocation