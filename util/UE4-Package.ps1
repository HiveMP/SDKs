param($UeVersion, $SdkVersion)

$ErrorActionPreference = 'Stop'

. ./util/Make-Zip.ps1;

if (Test-Path UnrealEngine-$UeVersion-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip) { 
  Remove-Item UnrealEngine-$UeVersion-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip 
} 
ZipFiles UnrealEngine-$UeVersion-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip dist/UnrealEngine-$UeVersion