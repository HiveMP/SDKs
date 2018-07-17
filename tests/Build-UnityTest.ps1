#!/usr/bin/env pwsh
param($Version = "5.4.1f", $Target = "")

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

Set-Location $PSScriptRoot

function Wait-For-Unity-Exit($path, $processId) {
  $offset = 0
  $outcome = "nothing";
  $running = $true;
  $cleanupTime = $null
  $startTime = (Get-Date)
  while ($running) {
    if (!(Test-Path $path)) {
      if (((Get-Date)-$startTime).TotalSeconds -gt 30) {
        Write-Host "Unity didn't start in time.. killing and retrying...";
        try { Stop-Process -Force -Id $processId; } catch { }
        while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
          Write-Host "Waiting for Unity to exit...";
          sleep -Seconds 1;
        }
        return "retry";
      }
      sleep 1;
      Write-Host "Waiting for Unity to start...";
      continue;
    }
    $s = (Get-Content -Raw $path);
    if ($s.Length -le $offset) {
      if ($cleanupTime -ne $null) {
        if (((Get-Date)-$cleanupTime).TotalSeconds -gt 20) {
          Write-Host "Mono cleanup took longer than 20 seconds - Unity is stalled!";
          try { Stop-Process -Force -Id $processId; } catch { }
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
          try { Stop-Process -Force -Id $processId; } catch { }
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
        try { Stop-Process -Force -Id $processId; } catch { }
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
      try { Stop-Process -Force -Id $processId; } catch { }
      while ((Get-Process | where -FilterScript {$_.Id -eq $processId}).Count -gt 0) {
        Write-Host "Waiting for Unity to exit...";
        sleep -Seconds 1;
      }
      return "retry";
    }
    if ($l.Contains("Canceling DisplayDialog: Updating license failed Failed to update license within 60 seconds")) {
      Write-Host "Licensing timeout - Unity has stalled!";
      try { Stop-Process -Force -Id $processId; } catch { }
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
    } elseif ($l.Contains("Exiting batchmode") -or $l.Contains("Aborting batchmode") -or $l.Contains("Plugins colliding with each other") -or $l.Contains("target is not supported in this Unity build")) {
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
    echo "Building project for $platform..."
    if (Test-Path "$PSScriptRoot\Unity.log") {
      rm -Force "$PSScriptRoot\Unity.log"
    }
    $unity = "C:\Program Files\Unity\Editor\Unity.exe"
    if (Test-Path "C:\Program Files\Unity_$Version\Editor\Unity.exe") {
      $unity = "C:\Program Files\Unity_$Version\Editor\Unity.exe"
    }
    $suffix = ""
    if ($platform.Contains("Win")) {
      $suffix = ".exe";
    }
    $authArgs = @()
    if ($env:UNITY_LICENSE_PASSWORD -ne $null) {
      $authArgs = @(
        "-username",
        $env:UNITY_LICENSE_USERNAME,
        "-password",
        $env:UNITY_LICENSE_PASSWORD,
        "-force-free"
      )
    }
    $process = Start-Process `
      -FilePath $unity `
      -ArgumentList ($authArgs + @(
        "-quit",
        "-batchmode",
        "-force-d3d9",
        "-nographics",
        "-projectPath",
        "$PSScriptRoot",
        $uPlatform,
        "$PSScriptRoot\$platform\HiveMPTest$suffix",
        "-logFile",
        "$PSScriptRoot\Unity.log"
      )) `
      -PassThru
    if ($process -eq $null) {
      Write-Error "Unity didn't start correctly!"
      exit 1;
    }
    $outcome = (Wait-For-Unity-Exit "$PSScriptRoot\Unity.log" $process.Id);
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

if ($Target -eq "Linux32") {
  if ($Version -eq "5.4.1f" -or $Version -eq "2017.1.1f1" -or $Version -eq "2017.2.0f3") {
    Do-Unity-Build "-buildLinux32Player" "Linux32"
  }
}
if ($Target -eq "Linux64") {
  Do-Unity-Build "-buildLinux64Player" "Linux64"
}
if ($Version -eq "5.4.1f" -or $Version -eq "2017.1.1f1" -or $Version -eq "2017.2.0f3") {
  if ($Target -eq "Mac32") {
    Do-Unity-Build "-buildOSXPlayer" "Mac32"
  }
  if ($Target -eq "Mac64") {
    Do-Unity-Build "-buildOSX64Player" "Mac64"
  }
} else {
  if ($Target -eq "Mac64") {
    Do-Unity-Build "-buildOSXUniversalPlayer" "Mac64"
  }
}
if ($Target -eq "Win32") {
  Do-Unity-Build "-buildWindowsPlayer" "Win32"
}
if ($Target -eq "Win64") {
  Do-Unity-Build "-buildWindows64Player" "Win64"
}