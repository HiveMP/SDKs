Write-Output "Hotpatching curl CMakeLists..."
$content = Get-Content -Raw -Path $PSScriptRoot\curl\CMakeLists.txt
if (!$content.Contains("#add_subdirectory(docs)"))
{
    $content = $content.Replace("add_subdirectory(docs)", "#add_subdirectory(docs)");
    Set-Content -Path $PSScriptRoot\curl\CMakeLists.txt -Value $content
}

cd $PSScriptRoot/curl
git update-index --assume-unchanged ./CMakeLists.txt