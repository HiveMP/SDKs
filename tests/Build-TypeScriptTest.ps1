#!/usr/bin/env pwsh
param($Target = "")

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

Set-Location $PSScriptRoot

yarn --cache-folder ./cache
if ($LastExitCode -ne 0) {
  Write-Error "yarn did not exit successfully!"
  exit 1
}