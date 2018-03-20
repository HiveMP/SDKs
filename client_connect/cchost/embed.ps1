cd $PSScriptRoot\..\ccsrc

Write-Output "Installing modules..."
yarn
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Output "Compiling SDK TypeScript code with Webpack..."
.\node_modules\.bin\webpack
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

cd $PSScriptRoot

Write-Output "Reading bundle content..."
$Bundle = Get-Content -Raw -Path $PSScriptRoot\..\ccsrc\dist\bundle.js
Write-Output "Converting to ASCII byte array..."
$ASCIIBytes = [System.Text.Encoding]::ASCII.GetBytes($Bundle)
Write-Output "Generating embedded code... $($ASCIIBytes.Length) bytes"
$EmbeddedCode = $ASCIIBytes -join ",";
<#for ($i = 0; $i -lt $ASCIIBytes.Length; $i += 512) {
  if ($i -lt $ASCIIBytes.Length - 512) {
    $EmbeddedCode += ($ASCIIBytes[$i..($i+512)] -join ",") + ",`n"
  } else {
    $EmbeddedCode += ($ASCIIBytes[$i..($ASCIIBytes.Length-1)] -join ",") + ",`n"
  }
}#>
Write-Output "Writing embed.cpp..."
Set-Content -Path $PSScriptRoot\embed.cpp -Value @"
#include `"embed.h`"
const char _embedded_sdk[] { $EmbeddedCode, 0 };
"@;