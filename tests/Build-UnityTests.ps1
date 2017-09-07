param()

$global:ErrorActionPreference = "Stop"

function Wait-For-Unity-Exit($path) {
  $linesRead = 0
  $result = $false;
  $running = $true;
  while ($running) {
    if (!(Test-Path $path)) {
      sleep 1;
      Write-Host "Waiting for Unity to start...";
      continue;
    }
    $log = Get-Content $path | Select-Object -Skip $linesRead;
    foreach ($l in $log) {
      Write-Host $l
      if ($l.Contains("Exiting batchmode successfully")) {
        $result = $true;
        $running = $false;
        break;
      } elseif ($l.Contains("Exiting batchmode")) {
        $running = $false;
        break;
      }
    }
    $linesRead += $log.Count;
    sleep -Milliseconds 100;
  }
  while ((Get-Process | where -FilterScript {$_.Name -eq "Unity"}).Count -gt 0) {
    Write-Host "Waiting for Unity to exit...";
    sleep -Seconds 1;
  }
  return $result;
}

function Do-Unity-Build($uPlatform, $platform) {
  if (Test-Path "$PSScriptRoot\..\tests\UnityTest\Unity.log") {
    rm -Force "$PSScriptRoot\..\tests\UnityTest\Unity.log"
  }
  & "C:\Program Files\Unity\Editor\Unity.exe" -quit -batchmode -nographics -projectPath "$PSScriptRoot\..\tests\UnityTest" $uPlatform "$PSScriptRoot\..\tests\UnityTest\Builds\$platform\HiveMPTest" -logFile "$PSScriptRoot\..\tests\UnityTest\Unity.log"
  if ($LastExitCode -ne 0) {
    Write-Error "Unity didn't start correctly!"
    exit 1;
  }
  if (!(Wait-For-Unity-Exit "$PSScriptRoot\..\tests\UnityTest\Unity.log")) {
    Write-Error "Unity didn't build successfully!"
    exit 1;
  }
}

cd $PSScriptRoot\..

echo "Cleaning tests/UnityTest..."
try {
  taskkill /f /im Unity.exe
} catch { }
git clean -xdff "$PSScriptRoot\..\tests\UnityTest"
if ($LastExitCode -ne 0) {
  exit 1;
}
git checkout HEAD -- "$PSScriptRoot\..\tests\UnityTest"
if ($LastExitCode -ne 0) {
  exit 1;
}

echo "Unpacking SDK package..."
Add-Type -AssemblyName System.IO.Compression.FileSystem;
$sdkName = (Get-Item $PSScriptRoot\..\Unity-SDK*.zip).FullName;
echo $sdkName
[System.IO.Compression.ZipFile]::ExtractToDirectory($sdkName, "$PSScriptRoot\..\tests\UnityTest\Assets\HiveMP");

echo "Building project for Linux32..."
Do-Unity-Build "-buildLinux32Player" "Linux32"
echo "Building project for Linux64..."
Do-Unity-Build "-buildLinux64Player" "Linux64"
echo "Building project for Mac64..."
Do-Unity-Build "-buildOSX64Player" "Mac64"
echo "Building project for Win32..."
Do-Unity-Build "-buildWindowsPlayer" "Win32"
echo "Building project for Win64..."
Do-Unity-Build "-buildWindows64Player" "Win64"