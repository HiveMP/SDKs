param($SdkVersion)

./tests/Build-UnityPackage.ps1 -Version 5.4.1f -PackageVersion "$SdkVersion.$ENV:BUILD_NUMBER"
Move-Item -Force tests/UnityTest-5.4.1f/HiveMPSDK-$SdkVersion.$ENV:BUILD_NUMBER.unitypackage ./Unity-SDK.$SdkVersion.$ENV:BUILD_NUMBER.unitypackage