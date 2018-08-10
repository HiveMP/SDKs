param($SdkVersion)

$ErrorActionPreference = 'Stop'

try {
  New-Item -Path ./assets -ItemType Directory
} catch { }
if (Test-Path ./assets/hivemp.tgz) { 
  Remove-Item ./assets/hivemp.tgz
}

Push-Location ./dist/TypeScript
try {
  $PackageJson = (Get-Content -Raw -Path ./package.json)
  $PackageJson = $PackageJson.Replace("`"version`": `"0.0.1`"", "`"version`": `"$SdkVersion.0`"");
  Set-Content -Path ./package.json -Value $PackageJson

  yarn
  if ($LastExitCode -ne 0) {
    Write-Error "yarn failed to run successfully!"
    exit 1
  }

  .\node_modules\.bin\tsc
  if ($LastExitCode -ne 0) {
    Write-Error "tsc failed to run successfully!"
    exit 1
  }

  yarn pack --filename hivemp.tgz
  if ($LastExitCode -ne 0) {
    Write-Error "yarn pack failed to run successfully!"
    exit 1
  }

  # TODO: Get this working
  # if ($env:PGP_PRIVATE_KEY -ne $null -and $env:PGP_PRIVATE_KEY_PASSPHRASE -ne $null) {
  #   .\node_modules\.bin\pkgsign sign --signer pgp --pgp-private-key-path "$PGP_PRIVATE_KEY" --pgp-private-key-passphrase "$PGP_PRIVATE_KEY_PASSPHRASE" --pgp-public-key-https-url "https://hivemp.com/sign.asc" "./hivemp.tgz"
  #   if ($LastExitCode -ne 0) {
  #     Write-Error "pkgsign failed to run successfully!"
  #     exit 1
  #   }
  # }
} finally {
  Pop-Location
}

Copy-Item -Force ./dist/TypeScript/hivemp.tgz ./assets/hivemp.tgz