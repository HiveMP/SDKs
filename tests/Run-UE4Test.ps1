#!/usr/bin/env pwsh
param([string] $Version = "4.16", [string] $Platform)

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}
function Wait-For-Unreal-Exit($path, $processId) {
  $offset = 0
  $outcome = "nothing";
  $running = $true;
  while ($running) {
    if (!(Test-Path $path)) {
      sleep 1;
      Write-Host "Waiting for Unreal to start...";
      continue;
    }
    $s = (Get-Content -Raw $path);
    if ($s.Length -le $offset) {
      sleep 1;
      continue;
    }
    $l = $s.Substring($offset);
    if ($l -ne $null -and $l.Length -eq 0) {
      sleep 1;
      continue;
    }
    Write-Host -NoNewline $l
    if ($l -ne $null -and $l.Contains("TEST PASS")) {
      $outcome = "success";
      $running = $false;
      break;
    } elseif ($l -ne $null -and $l.Contains("TEST FAIL")) {
      $outcome = "failure";
      $running = $false;
      break;
    } elseif ($l -ne $null -and $l.Contains("Critical error")) {
      # Game crashed, retry.
      $outcome = "retry";
      $running = false;
      break;
    } elseif ((Get-Process | where -FilterScript {$_.Id -eq $processId -and $_.ProcessName.Contains("UnrealTest")}).Count -eq 0) {
      # Game exited but we didn't see "TEST PASS"
      $outcome = "failure";
      $running = $false;
      break;
    }
    if ($l -ne $null) {
      $offset += $l.Length;
    }
    sleep -Milliseconds 100;
  }
  while ((Get-Process | where -FilterScript {$_.Id -eq $processId -and $_.ProcessName.Contains("UnrealTest")}).Count -gt 0) {
    Write-Host "Waiting for test game to exit...";
    sleep -Seconds 1;
  }
  return $outcome;
}

while ($true) {
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
      -ArgumentList @("-UNATTENDED", "-DX12") `
      -PassThru
    if ($process -eq $null) {
      Write-Error "Test game didn't start correctly!"
      exit 1;
    }
    Write-Output "Unreal process ID is $($process.Id)"
    $outcome = (Wait-For-Unreal-Exit $LogPath $process.Id);
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
  if ($outcome -eq "success") {
    exit 0;
  }
  exit 1;
}