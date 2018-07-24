Write-Output "Hotpatching curl CMakeLists..."
$content = Get-Content -Raw -Path $PSScriptRoot\curl\CMakeLists.txt
if (!$content.Contains("# add_subdirectory(docs)"))
{
    Push-Location $PSScriptRoot/curl
    try {
        git checkout HEAD ./lib/CMakeLists.txt ./CMakeLists.txt
        git apply ../curl-build.patch
        git update-index --assume-unchanged ./lib/CMakeLists.txt ./CMakeLists.txt
    } finally {
        Pop-Location
    }
}