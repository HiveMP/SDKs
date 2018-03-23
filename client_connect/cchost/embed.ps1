cd $PSScriptRoot\..\ccsrc

Write-Output "Installing modules for Client Connect..."
yarn
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Output "Installing modules for SDK Generator..."
Push-Location $PSScriptRoot\..\..
try {
  yarn
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

Write-Output "Generating HiveMP bindings for MuJS TypeScript..."
Push-Location $PSScriptRoot\..\..
try {
  .\node_modules\.bin\ts-node index.ts generate MuJS-TypeScript $PSScriptRoot\..\ccsrc\src\hivemp
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

Write-Output "Compiling SDK TypeScript code with Webpack..."
.\node_modules\.bin\ts-node .\node_modules\webpack-cli
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
Write-Output "Writing embed.cpp..."
Set-Content -Path $PSScriptRoot\embed.cpp -Value @"
#include `"embed.h`"
const char _embedded_sdk[] { $EmbeddedCode, 0 };
"@;