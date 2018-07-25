param([switch] $Force)

Write-Output "Hotpatching curl CMakeLists..."
$content = Get-Content -Raw -Path $PSScriptRoot\curl\CMakeLists.txt
if (!$content.Contains("# add_subdirectory(docs)") -or $Force)
{
    Push-Location $PSScriptRoot/curl
    try {
        git update-index --no-assume-unchanged ./lib/CMakeLists.txt ./CMakeLists.txt
        git checkout HEAD ./lib/CMakeLists.txt ./CMakeLists.txt
        git apply ../curl-build.patch
        git update-index --assume-unchanged ./lib/CMakeLists.txt ./CMakeLists.txt
    } finally {
        Pop-Location
    }
}

Write-Output "Hotpatching log.c..."
$content = Get-Content -Raw -Path $PSScriptRoot\log_c\src\log.h
if ($content.Contains("__FILE__") -or $Force)
{
    Push-Location $PSScriptRoot/log_c
    try {
        git update-index --no-assume-unchanged ./src/log.h
        git checkout HEAD ./src/log.h
        git apply ../log_c.patch
        git update-index --assume-unchanged ./src/log.h
    } finally {
        Pop-Location
    }
}