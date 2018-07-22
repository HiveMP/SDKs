param($UeVersion, $SdkVersion)

$ErrorActionPreference = 'Stop'

. ./util/Make-Zip.ps1;

if (Test-Path UnrealEngine-$UeVersion-SDK.$SdkVersion.zip) { 
  Remove-Item UnrealEngine-$UeVersion-SDK.$SdkVersion.zip 
} 
ZipFiles ./assets/UnrealEngine-$UeVersion-SDK.$SdkVersion.zip dist/UnrealEngine-$UeVersion