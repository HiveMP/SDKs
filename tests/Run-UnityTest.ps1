#!/usr/bin/env pwsh
param($Version = "5.4.1f", $Platform)

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Wait-For-Unity-Exit($path, $processId) {
  $offset = 0
  $outcome = "nothing";
  $running = $true;
  while ($running) {
    if (!(Test-Path $path)) {
      sleep 1;
      Write-Host "Waiting for Unity to start...";
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
    } elseif ($l -ne $null -and $l.Contains("Exception")) {
      $outcome = "failure";
      $running = $false;
      break;
    } elseif ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -eq 0) {
      # Game exited but we didn't see "Created game lobby"
      $outcome = "failure";
      $running = $false;
      break;
    }
    if ($l -ne $null) {
      $offset += $l.Length;
    }
    sleep -Milliseconds 100;
  }
  while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
    Write-Host "Waiting for test game to exit...";
    sleep -Seconds 1;
  }
  return $outcome;
}

while ($true) {
  if (Test-Path "$PSScriptRoot\UnityTest-$Version\$Platform\Unity.log") {
    rm -Force "$PSScriptRoot\UnityTest-$Version\$Platform\Unity.log"
  }
  $suffix = ""
  $outcome = "failure"
  if ($Platform.Contains("Win")) {
    $suffix = ".exe"
    $game = "$PSScriptRoot\UnityTest-$Version\$Platform\HiveMPTest$suffix"
    cd "$PSScriptRoot\UnityTest-$Version\$Platform"
    Write-Output "Running in $PSScriptRoot\UnityTest-$Version\$Platform"
    Write-Output "Executing $PSScriptRoot\UnityTest-$Version\$Platform\HiveMPTest$suffix"
    $process = Start-Process `
      -FilePath $game `
      -ArgumentList @(
        "-batchmode",
        "-nographics",
        "-logFile",
        "$PSScriptRoot\UnityTest-$Version\$Platform\Unity.log"
      ) `
      -PassThru
    if ($process -eq $null) {
      Write-Error "Test game didn't start correctly!"
      exit 1;
    }
    $outcome = (Wait-For-Unity-Exit "$PSScriptRoot\UnityTest-$Version\$Platform\Unity.log" $process.Id);
  } elseif ($Platform.Contains("Mac")) {
    cd "$PSScriptRoot\UnityTest-$Version\$Platform\HiveMPTest.app"
    Write-Host "Running macOS game..."
    Contents/MacOS/HiveMPTest -batchmode -nographics -logFile "$(Get-Location)/../log.txt"
    Write-Host "Reading log file..."
    $log = Get-Content -Raw "$(Get-Location)/../log.txt"
    echo $log
    if ($log.Contains("Created game lobby")) {
      $outcome = "success";
    } elseif ($l.Contains("Exception")) {
      $outcome = "failure";
    } else {
      # Game exited but we didn't see "Created game lobby"
      $outcome = "failure";
    }
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