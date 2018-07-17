param()

Write-Output "Building UAL..."
dotnet publish -c Release -r win10-x64
if ($LastExitCode -ne 0) {
  Write-Output "UAL failed to build!"
  exit 1
}

Move-Item -Force UnityAutomaticLicensor\bin\Release\netcoreapp2.1\win10-x64\publish ..\ual