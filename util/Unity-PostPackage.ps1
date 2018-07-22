param($SdkVersion)

$ErrorActionPreference = 'Stop'

./tests/Build-UnityPackage.ps1 -Version 5.4.1f -PackageVersion "$SdkVersion"
Move-Item -Force tests/UnityTest-5.4.1f/HiveMPSDK-$SdkVersion.unitypackage ./assets/Unity-SDK.$SdkVersion.unitypackage