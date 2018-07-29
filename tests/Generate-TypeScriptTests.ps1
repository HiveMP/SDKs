#!/usr/bin/env pwsh
param([string] $SdkVersion)

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Generate-Test() {
  for ($i=0; $i -lt 30; $i++) {
    try {
      Write-Output "Cleaning tests/TypeScriptNodeJsTest..."
      git clean -xdff "$PSScriptRoot\..\tests\TypeScriptNodeJsTest" 2>&1 | Out-Null;
      if ($LASTEXITCODE -eq 0) {
        break;
      }
    } catch {}
  }
  
  Write-Output "Copying SDK package..."
  Copy-Item -Force $PSScriptRoot\..\assets\hivemp.tgz "$PSScriptRoot\..\tests\TypeScriptNodeJsTest\hivemp.tgz"

  Write-Output "Copying build script..."
  Copy-Item -Force $PSScriptRoot\Build-TypeScriptTest.ps1 "$PSScriptRoot\..\tests\TypeScriptNodeJsTest\Build-TypeScriptTest.ps1"
}

Set-Location $PSScriptRoot\..

Generate-Test