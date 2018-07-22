def gcloud = evaluate readTrusted("jenkins/gcloud.groovy")
def hashing = evaluate readTrusted("jenkins/hashing.groovy")
def caching = evaluate readTrusted("jenkins/caching.groovy")

def sdkVersion = "";
def supportedUnityVersions = [
    "5.4.1f": [
        "Linux32",
        "Linux64",
        "Mac32",
        "Mac64",
        "Win32",
        "Win64",
    ],
    "2017.1.1f1": [
        "Linux32",
        "Linux64",
        "Mac32",
        "Mac64",
        "Win32",
        "Win64",
    ],
    "2017.2.0f3": [
        "Linux32",
        "Linux64",
        "Mac32",
        "Mac64",
        "Win32",
        "Win64",
    ],
    "2017.3.0f3": [
        "Linux64",
        "MacUniversal",
        "Win32",
        "Win64",
    ],
    "2018.1.7f1": [
        "Linux64",
        "MacUniversal",
        "Win32",
        "Win64",
    ],
];
def supportedUnrealVersions = [
    "4.17": [
        "Win64"
    ],
    "4.18": [
        "Win64"
    ],
    "4.19": [
        "Win64"
    ],
    // TODO: Add this when it's added to the build agents.
    // "4.20": [
    //     "Win64"
    // ],
];
def clientConnectPlatformCaches = [
    "Win32",
    "Win64",
    "Mac64",
    "Linux32",
    "Linux64"
]
def preloaded = [:]
def gitCommit = ""
def clientConnectHash = ""
// If changing the steps related to Client Connect build, increase this number.
def clientConnectBuildConfigVersion = "1"
def mainBuildHash = ""
// If changing the steps related to the main build, increase this number.
def mainBuildConfigVersion = "1"
def ualBuildHash = ""
def ualBuildConfigVersion = "1"
if (env.CHANGE_TARGET != null) {
    stage("Confirm") {
        input "Approve this PR build to run? Check the PR first!"
    }
}
stage("Setup") {
    node('linux') {
        gitCommit = checkout(poll: false, changelog: false, scm: scm).GIT_COMMIT
        sh ('echo ' + gitCommit)
        sh 'git clean -xdf'
        sh 'git submodule update --init --recursive'
        sh 'git submodule foreach --recursive git clean -xdf'
        sdkVersion = readFile 'SdkVersion.txt'
        sdkVersion = sdkVersion.trim()
        clientConnectHash = hashing.hashEntries(
            clientConnectBuildConfigVersion,
            [
                'client_connect/'
            ]
        );
        mainBuildHash = hashing.hashEntries(
            mainBuildConfigVersion,
            [
                'targets/'
                'sdks/',
                'index.ts',
                'SdkVersion.txt'
            ]
        );
        ualBuildHash = hashing.hashEntries(
            clientConnectBuildConfigVersion,
            [ ]
        );
    }
}
stage("Detect Caches") {
    def parallelMap = [:]
    clientConnectPlatformCaches.each {
        parallelMap["ClientConnect-" + it] = {
            caching.checkPreloaded(gcloud, preloaded, clientConnectHash, 'ClientConnect-' + it, 'Cloud Connect for target "' + it + '"')
        }
    }
    parallelMap["UAL"] = {
        caching.checkPreloaded(gcloud, preloaded, ualBuildHash, 'UAL', 'UAL')
    }
    parallelMap["SDKs"] = {
        caching.checkMultiplePreloaded(gcloud, preloaded, mainBuildHash, [ 'Assets', 'UncompiledTests' ], 'SDKs')
    }
    supportedUnityVersions.each { version, platforms -> 
        platforms.each { platform ->
            parallelMap["Unity-" + version + "-" + platform] =
            {
                caching.checkPreloaded(gcloud, preloaded, mainBuildHash, 'CompiledTest-Unity-' + versopm + '-' + platform, 'compiled Unity ' + version + ' test for ' + platform)
            }
        }
    }
    parallel (parallelMap)
}
stage("Build Client Connect") {
    def parallelMap = [:]
    parallelMap["Win32"] = {
        if (!preloaded["Win32"]) {
            node('windows-hispeed') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    bat 'git clean -xdf'
                    bat 'git submodule update --init --recursive'
                    bat 'git submodule foreach --recursive git clean -xdf'
                    bat 'yarn'
                    bat 'pwsh client_connect\\Build-Init.ps1'
                    bat 'pwsh client_connect\\Build-Arch.ps1 Win32'
                    caching.pushCacheDirectory(gcloud, clientConnectHash, 'ClientConnect-Win32', 'client_connect/sdk/Win32')
                }
            }
        }
    };
    parallelMap["Win64"] = {
        if (!preloaded["Win64"]) {
            node('windows-hispeed') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    bat 'git clean -xdf'
                    bat 'git submodule update --init --recursive'
                    bat 'git submodule foreach --recursive git clean -xdf'
                    bat 'yarn'
                    bat 'pwsh client_connect\\Build-Init.ps1'
                    bat 'pwsh client_connect\\Build-Arch.ps1 Win64'
                    caching.pushCacheDirectory(gcloud, clientConnectHash, 'ClientConnect-Win64', 'client_connect/sdk/Win64')
                }
            }
        }
    };
    parallelMap["Mac64"] = {
        if (!preloaded["Mac64"]) {
            node('mac') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    sh 'git clean -xdf'
                    sh 'git submodule update --init --recursive'
                    sh 'git submodule foreach --recursive git clean -xdf'
                    sh 'yarn'
                    sh 'pwsh client_connect/Build-Init.ps1'
                    sh 'pwsh client_connect/Build-Arch.ps1 Mac64'
                    caching.pushCacheDirectory(gcloud, clientConnectHash, 'ClientConnect-Mac64', 'client_connect/sdk/Mac64')
                }
            }
        }
    };
    parallelMap["Linux32"] = {
        if (!preloaded["Linux32"]) {
            node('linux') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    sh 'git clean -xdf'
                    sh 'git submodule update --init --recursive'
                    sh 'git submodule foreach --recursive git clean -xdf'
                    sh 'yarn'
                    sh 'pwsh client_connect/Build-Init.ps1'
                    sh 'pwsh client_connect/Build-Arch.ps1 Linux32'
                    caching.pushCacheDirectory(gcloud, clientConnectHash, 'ClientConnect-Linux32', 'client_connect/sdk/Linux32')
                }
            }
        }
    };
    parallelMap["Linux64"] = {
        if (!preloaded["Linux64"]) {
            node('linux') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    sh 'git clean -xdf'
                    sh 'git submodule update --init --recursive'
                    sh 'git submodule foreach --recursive git clean -xdf'
                    sh 'yarn'
                    sh 'pwsh client_connect/Build-Init.ps1'
                    sh 'pwsh client_connect/Build-Arch.ps1 Linux64'
                    caching.pushCacheDirectory(gcloud, clientConnectHash, 'ClientConnect-Linux64', 'client_connect/sdk/Linux64')
                }
            }
        }
    };
    parallel (parallelMap)
}
/*
node('linux') {
    stage("Archive Client Connect") {
        // Archive the SDKs together so we can download them from Jenkins for local development
        ws {
            unstash name: 'cc_sdk_Win32'
            unstash name: 'cc_sdk_Win64'
            unstash name: 'cc_sdk_Mac64'
            unstash name: 'cc_sdk_Linux32'
            unstash name: 'cc_sdk_Linux64'
            archiveArtifacts 'client_connect/sdk/**'
        }
    }
}
*/
stage("Build UAL") {
    if (!preloaded["UAL"]) {
        node('windows-hispeed') {
            dir('ual_build') {
                git changelog: false, poll: false, url: 'https://github.com/RedpointGames/UnityAutomaticLicensor'
                bat 'dotnet publish -c Release -r win10-x64'
                powershell 'Move-Item -Force UnityAutomaticLicensor\\bin\\Release\\netcoreapp2.1\\win10-x64\\publish ..\\ual'
            }
            caching.pushCacheDirectory(gcloud, ualBuildHash, 'UAL', 'ual')
        }
    }
}
/*
if (preloaded["SDKs"]) {
    // Just emit all the stages, we don't have any steps for them because it's all preloaded.
    stage("Generate") { 
        def parallelMap = [:]
        parallelMap["CSharp-4.5"] = { };
        parallelMap["CSharp-3.5"] = { };
        parallelMap["Unity"] = { };
        supportedUnrealVersions.each { version, platforms ->
            parallelMap["UnrealEngine-" + version] = { };
        }
        parallel (parallelMap)
    }
    stage("Licensing") { }
    stage("Package") { }
    stage("Stash Assets") { }
    stage("Generate Tests") {
        def parallelMap = [:]
        parallelMap["Stash-Test-Scripts"] = { };
        supportedUnityVersions.keySet().each { version ->
            parallelMap["Unity-" + version] = { };
        }
        supportedUnrealVersions.each { version, platforms ->
            parallelMap["UnrealEngine-" + version] = { };
        }
        parallel (parallelMap)
    }
} else {
    node('windows-hispeed') {
        stage("Generate") {
            checkout(poll: false, changelog: false, scm: scm)
            bat 'git clean -xdf'
            bat 'git submodule update --init --recursive'
            bat 'git submodule foreach --recursive git clean -xdf'
            bat 'yarn'
            unstash name: 'cc_sdk_Win32'
            unstash name: 'cc_sdk_Win64'
            unstash name: 'cc_sdk_Mac64'
            unstash name: 'cc_sdk_Linux32'
            unstash name: 'cc_sdk_Linux64'
            def parallelMap = [:]
            parallelMap["CSharp-4.5"] = {
                timeout(15) {
                    bat 'yarn run generator generate --client-connect-sdk-path client_connect/sdk -c CSharp-4.5 dist/CSharp-4.5'
                    bat 'cd dist/CSharp-4.5 && dotnet restore HiveMP.sln && dotnet build -c Release HiveMP.sln'
                }
            };
            parallelMap["CSharp-3.5"] = {
                timeout(15) {
                    bat 'yarn run generator generate --client-connect-sdk-path client_connect/sdk -c CSharp-3.5 dist/CSharp-3.5'
                    bat 'pwsh util/Fetch-NuGet.ps1'
                    bat 'cd dist/CSharp-3.5 && nuget restore && %windir%\\Microsoft.NET\\Framework64\\v4.0.30319\\msbuild /p:Configuration=Release /m HiveMP.sln'
                }
            };
            parallelMap["Unity"] = {
                timeout(5) {
                    bat 'yarn run generator generate --client-connect-sdk-path client_connect/sdk -c Unity dist/Unity'
                }
            };
            supportedUnrealVersions.each { version, platforms ->
                parallelMap["UnrealEngine-" + version] =
                {
                    timeout(5) {
                        bat 'yarn run generator generate --client-connect-sdk-path client_connect/sdk -c UnrealEngine-' + version + ' dist/UnrealEngine-' + version
                    }
                };
            }
            parallel (parallelMap)
        }
        stage("Licensing") {
            withCredentials([usernamePassword(credentialsId: 'unity-license-account', passwordVariable: 'UNITY_LICENSE_PASSWORD', usernameVariable: 'UNITY_LICENSE_USERNAME')]) {
                unstash 'ual'
                bat 'pwsh util/License-Unity.ps1'
            }
        }
        stage("Package") {
            def parallelMap = [:]
            parallelMap["CSharp"] = {
                timeout(10) {
                    bat 'pwsh util/Fetch-NuGet-4.5.ps1'
                    bat ('cd dist/CSharp-4.5 && nuget pack -Version ' + sdkVersion + ' -NonInteractive HiveMP.nuspec')
                }
            };
            parallelMap["Unity"] = {
                timeout(20) {
                    bat ('pwsh util/Unity-PrePackage.ps1 -SdkVersion ' + sdkVersion)
                    withCredentials([usernamePassword(credentialsId: 'unity-license-account', passwordVariable: 'UNITY_LICENSE_PASSWORD', usernameVariable: 'UNITY_LICENSE_USERNAME')]) {
                        bat ('pwsh util/Unity-PostPackage.ps1 -SdkVersion ' + sdkVersion)
                    }
                }
            };
            supportedUnrealVersions.keySet().each { version ->
                parallelMap["UnrealEngine-" + version] =
                {
                    timeout(10) {
                        bat ('pwsh util/UE4-Package.ps1 -UeVersion ' + version + ' -SdkVersion ' + sdkVersion)
                    }
                };
            }
            parallel (parallelMap)
        }
        stage("Stash Assets") {
            stash includes: ('assets/Unity-SDK.' + sdkVersion + '.zip'), name: 'unitysdk'
            stash includes: ('assets/Unity-SDK.' + sdkVersion + '.unitypackage'), name: 'unitypackage'
            supportedUnrealVersions.keySet().each { version ->
                stash includes: ('assets/UnrealEngine-' + version + '-SDK.' + sdkVersion + '.zip'), name: 'ue' + version.replace(/\./, '') + 'sdk'
            }
            googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash), credentialsId: 'redpoint-games-build-cluster', pattern: 'assets/**'
        }
        stage("Generate Tests") {
            def parallelMap = [:]
            parallelMap["Stash-Test-Scripts"] =
            {
                stash includes: ('tests/Run-UnityTest.ps1'), name: 'run-unity-test'
                stash includes: ('tests/Run-UE4Test.ps1'), name: 'run-ue4-test'
                googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash), credentialsId: 'redpoint-games-build-cluster', pattern: 'tests/Run-UnityTest.ps1'
                googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash), credentialsId: 'redpoint-games-build-cluster', pattern: 'tests/Run-UE4Test.ps1'
            };
            supportedUnityVersions.keySet().each { v ->
                def version = v
                parallelMap["Unity-" + version] =
                {
                    timeout(60) {
                        bat 'pwsh tests/Generate-UnityTests.ps1 -Version ' + version
                    }
                    timeout(10) {
                        stash includes: 'tests/UnityTest-' + version + '/**', name: 'unity-' + version + '-test-uncompiled'
                        googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash), credentialsId: 'redpoint-games-build-cluster', pattern: 'tests/UnityTest-' + version + '/**'
                    }
                };
            }
            supportedUnrealVersions.keySet().each { version ->
                parallelMap["UnrealEngine-" + version] =
                {
                    /*
                    lock(resource: "SDK_" + env.NODE_NAME, inversePrecedence: true) {
                        timeout(120) {
                            bat 'pwsh tests/Build-UE4Tests.ps1 -Version ' + version
                        }
                    }
                    timeout(10) {
                        stash includes: 'tests/UnrealBuilds-' + version + '/Win64/**', name: 'unreal-' + version + '-test-win64'
                        stash includes: 'tests/*.ps1', name: 'unreal-' + version + '-test-script'
                        googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash), credentialsId: 'redpoint-games-build-cluster', pattern: 'tests/UnityTest-' + version + '/**'
                    }
                    * /
                };
            }
            parallel (parallelMap)
        }
    }
}
stage("Build Tests") {
    def parallelMap = [:]
    supportedUnityVersions.each { version, platforms -> 
        platforms.each { platform ->
            parallelMap["Unity-" + version + "-" + platform] =
            {
                if (!preloaded['Test-Unity-' + version + '-' + platform]) {
                    timeout(30) {
                        node('windows-hispeed') {
                            dir('_test_env/Unity-' + version + '-' + platform) {
                                unstash 'ual'
                                unstash name: 'unity-' + version + '-test-uncompiled'
                                withCredentials([usernamePassword(credentialsId: 'unity-license-account', passwordVariable: 'UNITY_LICENSE_PASSWORD', usernameVariable: 'UNITY_LICENSE_USERNAME')]) {
                                    bat('pwsh tests/UnityTest-' + version + '/License-Unity.ps1')
                                    bat('pwsh tests/UnityTest-' + version + '/Build-UnityTest.ps1 -Version ' + version + ' -Target ' + platform)
                                }
                                stash includes: ('tests/UnityTest-' + version + '/' + platform + '/**'), name: ('unity-' + version + '-test-' + platform)
                                googleStorageUpload bucket: ('gs://redpoint-build-cache/' + mainBuildHash + '/compiled_tests'), credentialsId: 'redpoint-games-build-cluster', pattern: 'tests/UnityTest-' + version + '/' + platform + '/**'
                            }
                        }
                    }
                }
            }
        }         
    }
    parallel (parallelMap)
}
stage("Run Tests") {
    def parallelMap = [:]
    supportedUnityVersions.each { version, platforms ->
        platforms.each { platform ->
            if (platform.startsWith("Mac")) {
                parallelMap["Unity-" + version + "-" + platform] =
                {
                    node('mac') {
                        timeout(30) {
                            unstash 'unity-' + version + '-test-' + platform
                            unstash 'run-unity-test'
                            sh 'chmod a+x tests/Run-UnityTest.ps1'
                            sh 'chmod -R a+rwx tests/UnityTest-' + version + '/' + platform + '/'
                            sh 'perl -pi -e \'s/\\r\\n|\\n|\\r/\\n/g\' tests/Run-UnityTest.ps1'
                            sh 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform ' + platform
                        }
                    }
                };
            } else if (platform.startsWith("Linux")) {
                // TODO: We don't run Linux tests yet (beyond making sure code compiles on Linux in the previous step)
            } else if (platform.startsWith("Win")) {
                node('windows') {
                    timeout(30) {
                        unstash 'unity-' + version + '-test-' + platform
                        unstash 'run-unity-test'
                        bat 'pwsh tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform ' + platform
                    }
                }
            }
        }
    }
    /*
    supportedUnrealVersions.each { version, platforms ->
        platforms.each { platform ->
            if (platform.startsWith("Mac")) {
                // TODO: We don't run macOS tests yet
            } else if (platform.startsWith("Linux")) {
                // TODO: We don't run Linux tests yet
            } else if (platform.startsWith("Win")) {
                node('windows') {
                    timeout(30) {
                        unstash 'unreal-' + version + '-test-' + platform
                        unstash 'run-ue4-test'
                        bat 'pwsh tests/Run-UE4Test.ps1 -Version ' + version + ' -Platform ' + platform
                    }
                }
            }
        }
    }
    * /
    parallel (parallelMap)
}
if (env.BRANCH_NAME == 'master') {
    stage("Push") {
        node('linux') {
            withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                timeout(3) {
                    sh('\$GITHUB_RELEASE release --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -c ' + gitCommit + ' -n "HiveMP SDKs ' + sdkVersion + '.' + env.BUILD_NUMBER + '" -d "This release is being created by the build server." -p')
                }
            }
        }
        def parallelMap = [:]
        parallelMap["CSharp"] = {
            timeout(15) {
                withCredentials([string(credentialsId: 'nuget-api-key', variable: 'NUGET_API_KEY')]) {
                    bat ('cd dist/CSharp-4.5 && nuget push -ApiKey %NUGET_API_KEY% -Source nuget.org -NonInteractive HiveMP.' + sdkVersion + '.%BUILD_NUMBER%.nupkg')
                }
                stash includes: 'dist/CSharp-4.5/HiveMP.' + sdkVersion + '.' + env.BUILD_NUMBER + '.nupkg', name: 'csharpsdk'
                node('linux') {
                    unstash 'csharpsdk'
                    withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                        sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -n CSharp-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.nupkg -f dist/CSharp-4.5/HiveMP.' + sdkVersion + '.' + env.BUILD_NUMBER + '.nupkg -l "HiveMP SDK for C# / .NET 3.5 or 4.5 and above"')
                    }
                }
            }
        };
        parallelMap["Unity"] = {
            node('linux') {
                timeout(15) {
                    unstash 'unitysdk'
                    unstash 'unitypackage'
                    withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                        sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -n Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage -f Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage -l "HiveMP SDK as a Unity package"')
                        sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -n Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -f Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -l "HiveMP SDK for Unity as a ZIP archive"')
                    }
                }
            }
        };
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version] =
            {
                node('linux') {
                    timeout(15) {
                        unstash 'ue' + version.replace(/\./, '') + 'sdk'
                        withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                            sh('\$GITHUB_RELEASE upload --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -n UnrealEngine-' + version + '-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -f UnrealEngine-' + version + '-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip -l "HiveMP SDK for Unreal Engine ' + version + '"')
                        }
                    }
                }
            };
        }
        parallel (parallelMap)
        node('linux') {
            withCredentials([string(credentialsId: 'HiveMP-Deploy', variable: 'GITHUB_TOKEN')]) {
                timeout(10) {
                    sh('\$GITHUB_RELEASE edit --user HiveMP --repo SDKs --tag ' + sdkVersion + '.' + env.BUILD_NUMBER + ' -n "HiveMP SDKs ' + sdkVersion + '.' + env.BUILD_NUMBER + '" -d "This is an automated release of the HiveMP SDKs. Refer to the [HiveMP documentation](https://hivemp.com/documentation/) for information on how to use these SDKs."')
                }
            }
        }
    }
}
*/