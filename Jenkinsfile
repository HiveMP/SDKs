node('windows') {
    stage("Checkout + Get Deps") {
        checkout poll: false, changelog: false, scm: scm
        bat 'git clean -xdff'
        bat 'yarn'
        bat 'yarn run getsdk'
    }
    stage("Generate") {
        parallel (
            "CSharp-4.5" : {
                bat 'yarn run generator -- generate --client-connect-sdk-path deps/HiveMP.ClientConnect/sdk -c CSharp-4.5 dist/CSharp-4.5'
                bat 'cd dist/CSharp-4.5 && dotnet restore HiveMP.sln && dotnet build -c Release HiveMP.sln'
            },
            "CSharp-3.5" : {
                bat 'yarn run generator -- generate --client-connect-sdk-path deps/HiveMP.ClientConnect/sdk -c CSharp-3.5 dist/CSharp-3.5'
                powershell 'wget -OutFile dist\\CSharp-3.5\\nuget.exe https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'
                bat 'cd dist/CSharp-3.5 && nuget restore && %windir%\\Microsoft.NET\\Framework64\\v4.0.30319\\msbuild /p:Configuration=Release /m HiveMP.sln'
            },
            "Unity" : {
                bat 'yarn run generator -- generate --client-connect-sdk-path deps/HiveMP.ClientConnect/sdk -c Unity dist/Unity'
            }
        )
    }
    stage("Package") {
        parallel (
            "CSharp" : {
                powershell 'wget -OutFile dist\\CSharp-4.5\\nuget.exe https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'
                bat 'cd dist/CSharp-4.5 && nuget pack -Version 1.0.%BUILD_NUMBER% -NonInteractive HiveMP.nuspec'
            }
        )
    }
    stage("Push") {
        parallel (
            "CSharp" : {
                bat 'cd dist/CSharp-4.5 && nuget push -Source nuget.org -NonInteractive HiveMP.1.0.%BUILD_NUMBER%.nupkg'
            }
        )
    }
    stage("Archive SDKs") {
        archiveArtifacts 'dist/**'
    }
}