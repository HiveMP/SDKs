param($SdkVersion)

$ErrorActionPreference = 'Stop'

try {
  New-Item -Path ./assets -ItemType Directory
} catch { }
. ./util/Make-Zip.ps1; 
if (Test-Path ./assets/Unity-SDK.$SdkVersion.zip) { 
  Remove-Item ./assets/Unity-SDK.$SdkVersion.zip 
}
ZipFiles ./assets/Unity-SDK.$SdkVersion.zip dist/Unity

./tests/Build-UnityPackage.ps1 -Version 5.4.1f -PackageVersion "$SdkVersion"
Move-Item -Force tests/UnityTest-5.4.1f/HiveMPSDK-$SdkVersion.unitypackage ./assets/Unity-SDK.$SdkVersion.unitypackage