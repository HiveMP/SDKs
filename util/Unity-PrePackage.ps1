param($SdkVersion)

$ErrorActionPreference = 'Stop'

. ./util/Make-Zip.ps1; 
if (Test-Path ./assets/Unity-SDK.$SdkVersion.zip) { 
  Remove-Item ./assets/Unity-SDK.$SdkVersion.zip 
}
ZipFiles ./assets/Unity-SDK.$SdkVersion.zip dist/Unity