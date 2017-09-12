#!/usr/bin/env powershell
param($Version = "4.16", $Platform)

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

$LogPath = "$PSScriptRoot\UnrealBuilds-$Version\$Platform\WindowsNoEditor\UnrealTest" + $Version.Replace(".", "") + "\Saved\Logs\UnrealTest" + $Version.Replace(".", "") + ".log";
if (Test-Path $LogPath) {
  rm -Force $LogPath
}
$suffix = ""
$outcome = "failure"
if ($Platform.Contains("Win")) {
  $suffix = ".exe"
  $game = "$PSScriptRoot\UnrealBuilds-$Version\$Platform\WindowsNoEditor\UnrealTest" + $Version.Replace(".", "") + ".exe"
  cd "$PSScriptRoot\UnrealBuilds-$Version\$Platform\WindowsNoEditor"
  $process = Start-Process `
    -FilePath $game `
    -ArgumentList @() `
    -PassThru
  if ($process -eq $null) {
    Write-Error "Test game didn't start correctly!"
    exit 1;
  }
  $outcome = (Wait-For-Unity-Exit "$PSScriptRoot\UnityBuilds-$Version\$Platform\Unity.log" $process.Id);
} elseif ($Platform.Contains("Mac")) {
  # MAC TODO
} else {
  # LINUX TODO
}

Write-Host "Outcome is $outcome!";
if ($outcome -eq "retry") {
  Sleep -Seconds 30
  continue;
}