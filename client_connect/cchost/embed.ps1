cd $PSScriptRoot

$Bundle = Get-Content -Raw -Path $PSScriptRoot\..\ccsrc\dist\bundle.js
$EmbeddedCode = $Bundle.Replace("\", "\\")
$EmbeddedCode = $EmbeddedCode.Replace("`"", "\`"");
$EmbeddedCode = $EmbeddedCode.Replace("`r`n", "`n");
$EmbeddedCode = $EmbeddedCode.Replace("`n", "\n`"`n  `"");
Set-Content -Path $PSScriptRoot\embed.cpp -Value @"
#include `"embed.h`"
const char* _embedded_sdk = `"$EmbeddedCode`";
"@;