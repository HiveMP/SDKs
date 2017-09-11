#!/usr/bin/env powershell
param($Version = "5.4.1f")

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Wait-For-Unity-Exit($path, $processId) {
  $offset = 0
  $outcome = "nothing";
  $running = $true;
  $cleanupTime = $null
  while ($running) {
    if (!(Test-Path $path)) {
      sleep 1;
      Write-Host "Waiting for Unity to start...";
      continue;
    }
    $s = (Get-Content -Raw $path);
    if ($s.Length -le $offset) {
      if ($cleanupTime -ne $null) {
        if (((Get-Date)-$cleanupTime).TotalSeconds -gt 20) {
          Write-Host "Mono cleanup took longer than 20 seconds - Unity is stalled!";
          Stop-Process -Force -Id $processId;
          while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
            Write-Host "Waiting for Unity to exit...";
            sleep -Seconds 1;
          }
          return "retry";
        }
      }
      sleep 1;
      continue;
    }
    $l = $s.Substring($offset);
    if ($l.Length -eq 0) {
      if ($cleanupTime -ne $null) {
        if (((Get-Date)-$cleanupTime).TotalSeconds -gt 20) {
          Write-Host "Mono cleanup took longer than 20 seconds - Unity is stalled!";
          Stop-Process -Force -Id $processId;
          while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
            Write-Host "Waiting for Unity to exit...";
            sleep -Seconds 1;
          }
          return "retry";
        }
      }
      sleep 1;
      continue;
    }
    Write-Host -NoNewline $l
    if ($cleanupTime -ne $null) {
      if (((Get-Date)-$cleanupTime).TotalSeconds -gt 20) {
        Write-Host "Mono cleanup took longer than 20 seconds - Unity is stalled!";
        Stop-Process -Force -Id $processId;
        while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
          Write-Host "Waiting for Unity to exit...";
          sleep -Seconds 1;
        }
        return "retry";
      }
    }
    if ($l.Contains("Cleanup mono") -or $l.Contains("Failed to build player")) {
      # Wait at most 20 seconds for Cleanup mono to finish, otherwise kill and retry
      $cleanupTime = (Get-Date)
    }
    if ($l.Contains("Failed to start Unity Package Manager: operation timed out")) {
      Write-Host "Package manager timeout - Unity has stalled!";
      Stop-Process -Force -Id $processId;
      while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
        Write-Host "Waiting for Unity to exit...";
        sleep -Seconds 1;
      }
      return "retry";
    }
    if ($l.Contains("Exiting batchmode successfully")) {
      $outcome = "success";
      $running = $false;
      break;
    } elseif ($l.Contains("cubemap not supported")) {
      # Intermittent failure? :/
      $outcome = "retry";
      $running = $false;
      break;
    } elseif ($l.Contains("Exiting batchmode") -or $l.Contains("Aborting batchmode")) {
      $outcome = "failure";
      $running = $false;
      break;
    }
    $offset += $l.Length;
    sleep -Milliseconds 100;
  }
  while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
    Write-Host "Waiting for Unity to exit...";
    sleep -Seconds 1;
  }
  return $outcome;
}

function Do-Unity-Build($uPlatform, $platform) {
  while ($true) {
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

    echo "Building project for $platform..."
    if (Test-Path "$PSScriptRoot\..\tests\UnityTest-$Version\Unity.log") {
      rm -Force "$PSScriptRoot\..\tests\UnityTest-$Version\Unity.log"
    }
    $unity = "C:\Program Files\Unity\Editor\Unity.exe"
    if (Test-Path "C:\Program Files\Unity_$Version\Editor\Unity.exe") {
      $unity = "C:\Program Files\Unity_$Version\Editor\Unity.exe"
    }
    $suffix = ""
    if ($platform.Contains("Win")) {
      $suffix = ".exe";
    }
    $process = Start-Process `
      -FilePath $unity `
      -ArgumentList @(
        "-quit",
        "-batchmode",
        "-force-d3d9",
        "-nographics",
        "-projectPath",
        "$PSScriptRoot\..\tests\UnityTest-$Version",
        $uPlatform,
        "$PSScriptRoot\..\tests\UnityBuilds-$Version\$platform\HiveMPTest$suffix",
        "-logFile",
        "$PSScriptRoot\..\tests\UnityTest-$Version\Unity.log"
      ) `
      -PassThru
    if ($process -eq $null) {
      Write-Error "Unity didn't start correctly!"
      exit 1;
    }
    $outcome = (Wait-For-Unity-Exit "$PSScriptRoot\..\tests\UnityTest-$Version\Unity.log" $process.Id);
    Write-Host "Outcome is $outcome!";
    if ($outcome -eq "retry") {
      Sleep -Seconds 30
      continue;
    }
    if ($outcome -eq "success") {
      return;
    } else {
      Write-Error "Unity didn't build successfully!"
      exit 1;
    }
    break;
  }
}

cd $PSScriptRoot\..

Do-Unity-Build "-buildLinux32Player" "Linux32"
Do-Unity-Build "-buildLinux64Player" "Linux64"
Do-Unity-Build "-buildOSXPlayer" "Mac32"
Do-Unity-Build "-buildOSX64Player" "Mac64"
Do-Unity-Build "-buildWindowsPlayer" "Win32"
Do-Unity-Build "-buildWindows64Player" "Win64"