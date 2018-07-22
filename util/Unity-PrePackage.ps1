param($SdkVersion)

$ErrorActionPreference = 'Stop'

New-Item -Path ./assets -ItemType Directory
. ./util/Make-Zip.ps1; 
if (Test-Path ./assets/Unity-SDK.$SdkVersion.zip) { 
  Remove-Item ./assets/Unity-SDK.$SdkVersion.zip 
}
ZipFiles ./assets/Unity-SDK.$SdkVersion.zip dist/Unity