def sdkVersion = "";
def supportedUnityVersions = [
    "5.4.1f",
    "2017.1.1f1",
    "2017.2.0b10"
]
def gitCommit = ""
def supportedUnrealVersions = [
    "4.16"
]
if (env.CHANGE_TARGET != null) {
    input "Approve this PR build to run? Check the PR first!"
}
node('windows-hispeed') {
    stage("Checkout + Get Deps") {
        gitCommit = (checkout poll: false, changelog: false, scm: scm).GIT_COMMIT
        bat ('echo ' + gitCommit)
        bat 'git clean -xdff'
        bat 'yarn'
        bat 'yarn run getsdk'
        sdkVersion = readFile 'SdkVersion.txt'
        sdkVersion = sdkVersion.trim()
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
            },
            "UnrealEngine-4.16" : {
                bat 'yarn run generator -- generate --client-connect-sdk-path deps/HiveMP.ClientConnect/sdk -c UnrealEngine-4.16 dist/UnrealEngine-4.16'
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
                powershell ('. ./util/Make-Zip.ps1; if (Test-Path Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip) { rm Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip }; ZipFiles Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip dist/Unity')
                stash includes: ('Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip'), name: 'unitysdk'
                powershell ('./tests/Build-UnityPackage.ps1 -Version 5.4.1f -PackageVersion "' + sdkVersion + '.' + env.BUILD_NUMBER + '"')
                powershell ('Move-Item -Force tests/UnityTest-5.4.1f/HiveMPSDK-' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage ./Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage')
                stash includes: ('Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage'), name: 'unitypackage'
            },
            "UnrealEngine-4.16" : {
                powershell ('. ./util/Make-Zip.ps1; if (Test-Path UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip) { rm UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip }; ZipFiles UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip dist/UnrealEngine-4.16')
                stash includes: ('UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip'), name: 'ue416sdk'
            }
        )
    }
    stage("Build Tests") {
        def parallelMap = [:]
        supportedUnityVersions.each { v ->
            def version = v
            parallelMap["Unity-" + version] =
            {
                powershell 'tests/Build-UnityTests.ps1 -Version ' + version
                stash includes: 'tests/UnityBuilds-' + version + '/Linux32/**', name: 'unity-' + version + '-test-linux32'
                stash includes: 'tests/UnityBuilds-' + version + '/Linux64/**', name: 'unity-' + version + '-test-linux64'
                stash includes: 'tests/UnityBuilds-' + version + '/Mac32/**', name: 'unity-' + version + '-test-mac32'
                stash includes: 'tests/UnityBuilds-' + version + '/Mac64/**', name: 'unity-' + version + '-test-mac64'
                stash includes: 'tests/UnityBuilds-' + version + '/Win32/**', name: 'unity-' + version + '-test-win32'
                stash includes: 'tests/UnityBuilds-' + version + '/Win64/**', name: 'unity-' + version + '-test-win64'
                stash includes: 'tests/*.ps1', name: 'unity-' + version + '-test-script'
            };
        }
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version] =
            {
                powershell 'tests/Build-UE4Tests.ps1 -Version ' + version
                stash includes: 'tests/UnrealBuilds-' + version + '/Win32/**', name: 'unreal-' + version + '-test-win32'
                stash includes: 'tests/UnrealBuilds-' + version + '/Win64/**', name: 'unreal-' + version + '-test-win64'
                stash includes: 'tests/*.ps1', name: 'unreal-' + version + '-test-script'
            };
        }
        parallel (parallelMap)
    }
    stage("Run Tests") {
        def parallelMap = [:]
        supportedUnityVersions.each { v ->
            def version = v
            parallelMap["Unity-" + version + "-Mac32"] =
            {
                node('mac') {
                    unstash 'unity-' + version + '-test-mac32'
                    unstash 'unity-' + version + '-test-script'
                    sh 'chmod a+x tests/Run-UnityTest.ps1'
                    sh 'chmod -R a+rwx tests/UnityBuilds-' + version + '/'
                    sh 'perl -pi -e \'s/\\r\\n|\\n|\\r/\\n/g\' tests/Run-UnityTest.ps1'
                    sh 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Mac32'
                }
            };
            parallelMap["Unity-" + version + "-Mac64"] =
            {
                node('mac') {
                    unstash 'unity-' + version + '-test-mac64'
                    unstash 'unity-' + version + '-test-script'
                    sh 'chmod a+x tests/Run-UnityTest.ps1'
                    sh 'chmod -R a+rwx tests/UnityBuilds-' + version + '/'
                    sh 'perl -pi -e \'s/\\r\\n|\\n|\\r/\\n/g\' tests/Run-UnityTest.ps1'
                    sh 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Mac64'
                }
            };
            parallelMap["Unity-" + version + "-Win32"] =
            {
                node('windows') {
                    unstash 'unity-' + version + '-test-win32'
                    unstash 'unity-' + version + '-test-script'
                    powershell 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Win32'
                }
            };
            parallelMap["Unity-" + version + "-Win64"] =
            {
                node('windows') {
                    unstash 'unity-' + version + '-test-win64'
                    unstash 'unity-' + version + '-test-script'
                    powershell 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Win64'
                }
            };
        }
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version + "-Win32"] =
            {
                node('windows') {
                    unstash 'unreal-' + version + '-test-win32'
                    unstash 'unreal-' + version + '-test-script'
                    powershell 'tests/Run-UE4Test.ps1 -Version ' + version + ' -Platform Win32'
                }
            };
            parallelMap["UnrealEngine-" + version + "-Win64"] =
            {
                node('windows') {
                    unstash 'unreal-' + version + '-test-win64'
                    unstash 'unreal-' + version + '-test-script'
                    powershell 'tests/Run-UE4Test.ps1 -Version ' + version + ' -Platform Win64'
                }
            };
        }
        parallel (parallelMap)
    }
    if (env.BRANCH_NAME == 'master') {
        stage("Push") {
            node('linux') {
                withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                    sh('\$GITHUB_RELEASE release --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -c ' + gitCommit + ' -n "HiveMP SDKs ' + sdkVersion + '.' + env.BUILD_NUMBER + '" -d "This is an automated release of the HiveMP SDKs. Refer to the HiveMP documentation on how to use these SDKs." -p')
                }
            }
            parallel (
                "CSharp" : {
                    bat ('cd dist/CSharp-4.5 && nuget push -Source nuget.org -NonInteractive HiveMP.' + sdkVersion + '.%BUILD_NUMBER%.nupkg')
                    stash includes: 'HiveMP.' + sdkVersion + '.' + env.BUILD_NUMBER, name: 'csharpsdk'
                    node('linux') {
                        unstash 'csharpsdk'
                        withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                            sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -l CSharp-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.nupkg -f HiveMP.' + sdkVersion + '.' + env.BUILD_NUMBER + '.nupkg')
                        }
                    }
                },
                "Unity" : {
                    node('linux') {
                        unstash 'unitysdk'
                        unstash 'unitypackage'
                        withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                            sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -l Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage -f Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage')
                            sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -l Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -f Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip')
                        }
                    }
                },
                "UnrealEngine-4.16" : {
                    node('linux') {
                        unstash 'ue416sdk'
                        withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                            sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -l UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -f UnrealEngine-4.16-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip')
                        }
                    }
                }
            )
            node('linux') {
                withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                    sh('\$GITHUB_RELEASE edit --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -c ' + gitCommit + ' -n "HiveMP SDKs ' + sdkVersion + '.' + env.BUILD_NUMBER + '" -d "This is an automated release of the HiveMP SDKs. Refer to the HiveMP documentation on how to use these SDKs."')
                }
            }
        }
    }
}