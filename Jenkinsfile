def sdkVersion = "";
if (env.CHANGE_TARGET != null) {
    input "Approve this PR build to run? Check the PR first!"
}
node('windows') {
    stage("Checkout + Get Deps") {
        checkout poll: false, changelog: false, scm: scm
        bat 'git clean -xdff'
        bat 'yarn'
        bat 'yarn run getsdk'
        sdkVersion = readFile 'SdkVersion.txt'
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
                bat ('cd dist/CSharp-4.5 && nuget pack -Version ' + sdkVersion + '.%BUILD_NUMBER% -NonInteractive HiveMP.nuspec')
            },
            "Unity" : {
                powershell ('. ./util/Make-Zip.ps1; if (Test-Path Unity-SDK.' + sdkVersion + '.\$env:BUILD_NUMBER.zip) { rm Unity-SDK.' + sdkVersion + '.\$env:BUILD_NUMBER.zip }; ZipFiles Unity-SDK.' + sdkVersion + '.\$env:BUILD_NUMBER.zip dist/Unity')
                stash includes: ('Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip'), name: 'unitysdk'
            }
        )
    }
    stage("Build Tests") {
        //parallel (
        //    "Unity" : {
                powershell 'tests/Build-UnityTests.ps1'
                stash includes: 'tests/UnityBuilds/Linux32/**', name: 'unity5test-linux32'
                stash includes: 'tests/UnityBuilds/Linux64/**', name: 'unity5test-linux64'
                stash includes: 'tests/UnityBuilds/Mac32/**', name: 'unity5test-mac32'
                stash includes: 'tests/UnityBuilds/Mac64/**', name: 'unity5test-mac64'
                stash includes: 'tests/UnityBuilds/Win32/**', name: 'unity5test-win32'
                stash includes: 'tests/UnityBuilds/Win64/**', name: 'unity5test-win64'
                stash includes: 'tests/UnityBuilds/*.ps1', name: 'unity5test-script'
        //    }
        //)
    }
    stage("Run Tests") {
        parallel (
            /*"Unity-Linux32" : {
                node('linux') {
                    unstash 'unitytest-linux32'
                    unstash 'unitytest-script-unix'
                    powershell 'tests/Run-UnityTest.sh Linux32'
                }
            },
            "Unity-Linux64" : {
                node('linux') {
                    unstash 'unitytest-linux64'
                    unstash 'unitytest-script-unix'
                    powershell 'tests/Run-UnityTest.sh Linux64'
                }
            },*/
            "Unity-5.4.1f-Mac32" : {
                node('mac') {
                    unstash 'unitytest-mac32'
                    unstash 'unitytest-script'
                    sh 'tests/Run-UnityTest.ps1 -Platform Mac64'
                }
            },
            "Unity-5.4.1f-Mac64" : {
                node('mac') {
                    unstash 'unitytest-mac64'
                    unstash 'unitytest-script'
                    sh 'tests/Run-UnityTest.ps1 -Platform Mac64'
                }
            },
            "Unity-5.4.1f-Win32" : {
                node('windows') {
                    unstash 'unitytest-win32'
                    unstash 'unitytest-script'
                    powershell 'tests/Run-UnityTest.ps1 -Platform Win32'
                }
            },
            "Unity-5.4.1f-Win64" : {
                node('windows') {
                    unstash 'unitytest-win64'
                    unstash 'unitytest-script'
                    powershell 'tests/Run-UnityTest.ps1 -Platform Win64'
                }
            }
        )
    }
    if (env.BRANCH_NAME == 'master') {
        stage("Push") {
            parallel (
                "CSharp" : {
                    bat ('cd dist/CSharp-4.5 && nuget push -Source nuget.org -NonInteractive HiveMP.' + sdkVersion + '.%BUILD_NUMBER%.nupkg')
                }
            )
        }
    }
    stage("Archive SDKs") {
        archiveArtifacts 'dist/**'
    }
}