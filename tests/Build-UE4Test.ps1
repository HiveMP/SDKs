#!/usr/bin/env pwsh
param([string] $Version = "4.16", [string] $Target = "")

$global:ErrorActionPreference = "Stop"

$OriginalLocation = $(pwd)

trap {
  Write-Output $_
  cd $OriginalLocation
  exit 1
}

$TestPath = "$PSScriptRoot";
$UnrealEnginePath = "C:\Program Files\Epic Games\UE_" + $Version + "\Engine";
$RunUAT = "$UnrealEnginePath\Build\BatchFiles\RunUAT.bat";
$UnrealBuildTool = "$UnrealEnginePath\Binaries\DotNET\UnrealBuildTool.exe";
$ProjectNameNoExt = "UnrealTest" + $Version.Replace(".", "");
$ProjectName = "UnrealTest" + $Version.Replace(".", "") + ".uproject";

function Do-Unreal-Build($Platform) {
  $OutputDir = "$PSScriptRoot\..\UnrealBuilds-$Version\$Platform";

  echo "Building project for $Platform...";
  cd $TestPath;
  & $RunUAT BuildCookRun -nocompileeditor -installed -nop4 -project="$TestPath\$ProjectName" -cook -stage -archive -archivedirectory="$OutputDir" -package -clientconfig=Development -pak -prereqs -nodebuginfo -targetplatform=$Platform -build -unattended
  if ($LASTEXITCODE -eq 0) {
    return;
  } else {
    throw "Unreal Engine failed to build!"
  }
}

cd $PSScriptRoot\..

cd $TestPath
& $UnrealBuildTool Development Win64 -project="$TestPath\$ProjectName" -TargetType=Editor -Progress -NoHotReloadFromIDE
if ($LASTEXITCODE -ne 0) {
  throw "Unreal Engine failed to build!"
}

if ($Target -eq "Win64") {
  Do-Unreal-Build "Win64"
}

cd $OriginalLocation