#!/usr/bin/env pwsh
param([string] $Version = "4.16", [switch] $Target = "")

$global:ErrorActionPreference = "Stop"

$OriginalLocation = $(pwd)

trap {
  Write-Output $_
  cd $OriginalLocation
  exit 1
}

$TestPath = "$PSScriptRoot\..\tests\UnrealTest" + $Version.Replace(".", "");
$UnrealEnginePath = "C:\Program Files\Epic Games\UE_" + $Version + "\Engine";
$RunUAT = "$UnrealEnginePath\Build\BatchFiles\RunUAT.bat";
$UnrealBuildTool = "$UnrealEnginePath\Binaries\DotNET\UnrealBuildTool.exe";
$ProjectNameNoExt = "UnrealTest" + $Version.Replace(".", "");
$ProjectName = "UnrealTest" + $Version.Replace(".", "") + ".uproject";

function Do-Unreal-Build($Platform) {
  $OutputDir = "$PSScriptRoot\..\tests\UnrealBuilds-$Version\$Platform";

  echo "Building project for $Platform...";
  $BuildMode = "-build";
  cd $TestPath;
  & $RunUAT BuildCookRun -project="$TestPath\$ProjectName" -noP4 -platform="$Platform" -editorconfig=Development -clientconfig=Development -serverconfig=Development -cook -maps=AllMaps $BuildMode -stage -pak -archive -archivedirectory="$OutputDir" -unattended
  if ($LASTEXITCODE -eq 0) {
    return;
  } else {
    throw "Unreal Engine failed to build!"
  }
}

cd $PSScriptRoot\..

cd $TestPath
& $UnrealBuildTool $ProjectNameNoExt Development Win64 -project="$TestPath\$ProjectName" -editorrecompile -NoHotReloadFromIDE
if ($LASTEXITCODE -ne 0) {
  throw "Unreal Engine failed to build!"
}

if ($Target -eq "Win64") {
  Do-Unreal-Build "Win64"
}

cd $OriginalLocation