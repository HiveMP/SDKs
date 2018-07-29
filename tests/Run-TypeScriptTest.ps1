#!/usr/bin/env pwsh
param()

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

Push-Location "$PSScriptRoot\TypeScriptNodeJsTest\"
try {
  yarn test
  if ($LastExitCode -ne 0) {
    Write-Error "test suite did not exit successfully!"
    exit 1
  }
} finally {
  Pop-Location
}