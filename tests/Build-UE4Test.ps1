#!/usr/bin/env pwsh
param([string] $Version = "4.16", [string] $Target = "")

$global:ErrorActionPreference = "Stop"

$TestPath = "$PSScriptRoot";
$UnrealEnginePath = "C:\Program Files\Epic Games\UE_" + $Version + "\Engine";
$RunUAT = "$UnrealEnginePath\Build\BatchFiles\RunUAT.bat";
$UnrealBuildTool = "$UnrealEnginePath\Binaries\DotNET\UnrealBuildTool.exe";
$ProjectNameNoExt = "UnrealTest" + $Version.Replace(".", "");
$ProjectName = "UnrealTest" + $Version.Replace(".", "") + ".uproject";

function Do-Unreal-Build($Platform) {
  $OutputDir = "$PSScriptRoot\..\UnrealBuilds-$Version\$Platform";

  Write-Output "Building project for $Platform...";
  Push-Location $TestPath;
  try {
    & $RunUAT BuildCookRun -nocompileeditor -installed -nop4 -project="$TestPath\$ProjectName" -cook -stage -archive -archivedirectory="$OutputDir" -package -clientconfig=Development -pak -prereqs -nodebuginfo -targetplatform="$Platform" -build -unattended
    if ($LASTEXITCODE -eq 0) {
      return;
    } else {
      throw "Unreal Engine failed to build!"
    }
  } finally {
    Pop-Location
  }
}

Write-Output "Building UE4 editor code if necessary..."
Push-Location $TestPath
try {
  $UeMinorVersion = [int]($Version.Substring($Version.IndexOf(".") + 1))
  Write-Output "Minor UE4 version number is: $UeMinorVersion"
  if ($UeMinorVersion -lt 20) {
    Write-Output "& $UnrealBuildTool Development Win64 -project="$TestPath\$ProjectName" -editorrecompile -Progress -NoHotReloadFromIDE"
    & $UnrealBuildTool $ProjectNameNoExt Development Win64 -project="$TestPath\$ProjectName" -editorrecompile -Progress -NoHotReloadFromIDE
  } else {
    Write-Output "& $UnrealBuildTool Development Win64 -project="$TestPath\$ProjectName" -TargetType=Editor -Progress -NoHotReloadFromIDE"
    & $UnrealBuildTool Development Win64 -project="$TestPath\$ProjectName" -TargetType=Editor -Progress -NoHotReloadFromIDE
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Unreal Engine failed to build!"
  }
} finally {
  Pop-Location
}

if ($Target -eq "Win64") {
  Do-Unreal-Build "Win64"
}