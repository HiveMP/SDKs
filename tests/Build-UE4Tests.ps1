param([string] $Version = "4.16")

$global:ErrorActionPreference = "Stop"

trap {
  Write-Output $_
  exit 1
}

function Do-Unreal-Build($Platform) {
  $ProjectName = "UnrealTest" + $Version.Replace(".", "") + ".uproject";
  $TestPath = "tests/UnrealTest" + $Version.Replace(".", "");
  $UnrealEnginePath = "C:\Program Files\Epic Games\UE_" + $Version;
  $UnrealBuildTool = "$UnrealEnginePath\Build\BatchFiles\RunUAT.bat";
  $OutputDir = "$(pwd)\UnrealBuilds-$Version"

  echo "Cleaning tests/UnrealBuilds-$Version..."
  for ($i=0; $i -lt 30; $i++) {
    try {
      git clean -xdff "$TestPath";
      break;
    } catch {}
  }
  for ($i=0; $i -lt 30; $i++) {
    try {
      git checkout HEAD -- "$TestPath";
      break;
    } catch {}
  }
  
  echo "Unpacking SDK package..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $sdkName = (Get-Item $PSScriptRoot\..\UnrealEngine-$Version-SDK*.zip).FullName;
  echo $sdkName
  [System.IO.Compression.ZipFile]::ExtractToDirectory($sdkName, "$TestPath\Plugins\HiveMPSDK");

  echo "Building project for $Platform..."
  cd $TestPath
  & $UnrealBuildTool BuildCookRun -project=$ProjectName -noP4 -platform=$Platform -clientconfig=Development -serverconfig=Development -cook -maps=AllMaps -compile -stage -pak -archive -archivedirectory=$OutputDir
  if ($LASTEXITCODE -eq 0) {
    return;
  } else {
    throw "Unreal Engine failed to build!"
  }
}

cd $PSScriptRoot\..

Do-Unreal-Build "Win32"
Do-Unreal-Build "Win64"
