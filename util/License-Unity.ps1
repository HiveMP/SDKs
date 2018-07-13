param()

$ErrorActionPreference = 'Stop'

Write-Output "Downloading Unity licensing application..."
Invoke-WebRequest -UseBasicParsing -Uri https://github.com/RedpointGames/UnityAutomaticLicensor/releases/download/0.1/UnityAutomaticLicensor.zip -OutFile C:\UnityAutomaticLicensor.zip

Write-Output "Extracting Unity licensing application..."
if (Test-Path "C:\UAL") {
  Remove-Item -Force -Recurse "C:\UAL"
}
if (!(Test-Path "C:\UAL")) {
  New-Item -Path "C:\UAL" -ItemType Directory
}
[System.IO.Compression.ZipFile]::ExtractToDirectory("C:\UnityAutomaticLicensor.zip", "C:\UAL")

Write-Output "Running Unity licensing application..."
& C:\UAL\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_5.4.1f\Editor\Unity.exe"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}