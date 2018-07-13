param($SdkVersion)

$ErrorActionPreference = 'Stop'

. ./util/Make-Zip.ps1; 
if (Test-Path Unity-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip) { 
  Remove-Item Unity-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip 
}
ZipFiles Unity-SDK.$SdkVersion.$ENV:BUILD_NUMBER.zip dist/Unity