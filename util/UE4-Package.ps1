param($UeVersion, $SdkVersion)

$ErrorActionPreference = 'Stop'

. ./util/Make-Zip.ps1;

try {
  New-Item -Path ./assets -ItemType Directory
} catch {
}
if (Test-Path ./assets/UnrealEngine-$UeVersion-SDK.$SdkVersion.zip) { 
  Remove-Item ./assets/UnrealEngine-$UeVersion-SDK.$SdkVersion.zip 
} 
ZipFiles ./assets/UnrealEngine-$UeVersion-SDK.$SdkVersion.zip dist/UnrealEngine-$UeVersion