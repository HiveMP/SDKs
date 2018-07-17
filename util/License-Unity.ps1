param()

$ErrorActionPreference = 'Stop'

Write-Output "Cleaning up old license files..."
try {
  Remove-Item -Recurse -Force C:\ProgramData\Unity
} catch { }

Write-Output "Running Unity licensing application for 5.4.1f..."
& ual\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_5.4.1f\Editor\Unity.exe" --unity-version "v5.x"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.1..."
& ual\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.1.1f1\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.2..."
& ual\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.2.0f3\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2017.3..."
& ual\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2017.3.0f3\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}

Write-Output "Running Unity licensing application for 2018.1..."
& ual\UnityAutomaticLicensor.exe --username "$env:UNITY_LICENSE_USERNAME" --password "$env:UNITY_LICENSE_PASSWORD" --unity-path "C:\Program Files\Unity_2018.1.7f1\Editor\Unity.exe" --unity-version "lic"
if ($LastExitCode -ne 0) {
  Write-Error "Licensing didn't complete successfully."
  exit 1
}