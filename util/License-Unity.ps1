param()

$ErrorActionPreference = 'Stop'

Write-Output "Downloading Unity licensing application..."
Invoke-WebRequest -UseBasicParsing -Uri https://github.com/RedpointGames/UnityAutomaticLicensor/releases/download/0.5/UnityAutomaticLicensor.zip -OutFile C:\UnityAutomaticLicensor.zip

Write-Output "Extracting Unity licensing application..."
if (Test-Path "C:\UAL") {
  Remove-Item -Force -Recurse "C:\UAL"
}
if (!(Test-Path "C:\UAL")) {
  New-Item -Path "C:\UAL" -ItemType Directory
}
[System.IO.Compression.ZipFile]::ExtractToDirectory("C:\UnityAutomaticLicensor.zip", "C:\UAL")

Write-Output "Cleaning up old license files..."
try {
  Remove-Item -Recurse -Force C:\ProgramData\Unity
} catch { }

Write-Output "Running Unity licensing application for 5.4.1f..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_5.4.1f\Editor\Unity.exe" --unity-version "v5.x"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.1..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.1.1f1\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.2..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.2.0f3\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.3..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.3.0f3\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2018.1..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2018.1.7f1\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}