param([string] $Version = "4.16", [switch] $NoCleanAndSdkUnpack)

$global:ErrorActionPreference = "Stop"

$OriginalLocation = $(pwd)

trap {
  Write-Output $_
  cd $OriginalLocation
  exit 1
}

function Do-Unreal-Build($Platform) {
  $ProjectNameNoExt = "UnrealTest" + $Version.Replace(".", "");
  $ProjectName = "UnrealTest" + $Version.Replace(".", "") + ".uproject";
  $TestPath = "$PSScriptRoot\..\tests\UnrealTest" + $Version.Replace(".", "");
  $UnrealEnginePath = "C:\Program Files\Epic Games\UE_" + $Version + "\Engine";
  $RunUAT = "$UnrealEnginePath\Build\BatchFiles\RunUAT.bat";
  $UnrealBuildTool = "$UnrealEnginePath\Binaries\DotNET\UnrealBuildTool.exe";
  $OutputDir = "$PSScriptRoot\..\tests\UnrealBuilds-$Version\$Platform"

  if (!$NoCleanAndSdkUnpack) {
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
  }

  echo "Building project for $Platform..."
  cd $TestPath
  if ($Platform -eq "Win64") {
    & $UnrealBuildTool $ProjectNameNoExt Development Win64 -project="$TestPath\$ProjectName" -editorrecompile -NoHotReloadFromIDE
    if ($LASTEXITCODE -ne 0) {
      throw "Unreal Engine failed to build!"
    }
  }
  & $RunUAT BuildCookRun -project="$TestPath\$ProjectName" -noP4 -platform="$Platform" -editorconfig=Development -clientconfig=Development -serverconfig=Development -cook -maps=AllMaps -build -stage -pak -archive -archivedirectory="$OutputDir" -unattended
  if ($LASTEXITCODE -eq 0) {
    return;
  } else {
    throw "Unreal Engine failed to build!"
  }
}

cd $PSScriptRoot\..

Do-Unreal-Build "Win64"
Do-Unreal-Build "Win32"