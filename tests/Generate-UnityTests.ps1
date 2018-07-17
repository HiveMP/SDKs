#!/usr/bin/env pwsh
param($Version = "5.4.1f")

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Generate-Unity-Build($platform) {
  echo "Cleaning tests/UnityTest-$Version..."
  for ($i=0; $i -lt 30; $i++) {
    try {
      git clean -xdff "$PSScriptRoot\..\tests\UnityTest-$Version";
      break;
    } catch {}
  }
  for ($i=0; $i -lt 30; $i++) {
    try {
      git checkout HEAD -- "$PSScriptRoot\..\tests\UnityTest-$Version";
      break;
    } catch {}
  }
  
  echo "Unpacking SDK package..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $sdkName = (Get-Item $PSScriptRoot\..\Unity-SDK*.zip).FullName;
  echo $sdkName
  [System.IO.Compression.ZipFile]::ExtractToDirectory($sdkName, "$PSScriptRoot\..\tests\UnityTest-$Version\Assets\HiveMP");

  echo "Copying build script..."
  Copy-Item -Force $PSScriptRoot\Build-UnityTest.ps1 "$TestPath\Build-UnityTest.ps1"
}

cd $PSScriptRoot\..

if ($Version -eq "5.4.1f" -or $Version -eq "2017.1.1f1" -or $Version -eq "2017.2.0f3") {
  Generate-Unity-Build "Linux32"
}
Generate-Unity-Build "Linux64"
if ($Version -eq "5.4.1f" -or $Version -eq "2017.1.1f1" -or $Version -eq "2017.2.0f3") {
  Generate-Unity-Build "Mac32"
  Generate-Unity-Build "Mac64"
} else {
  Generate-Unity-Build "Mac64"
}
Generate-Unity-Build "Win32"
Generate-Unity-Build "Win64"