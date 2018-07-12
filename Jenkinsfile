def sdkVersion = "";
def supportedUnityVersions = [
    "5.4.1f",
    "2017.1.1f1",
    "2017.2.0f3",
    "2017.3.0f3"
]
def gitCommit = ""
def supportedUnrealVersions = [
    "4.17",
    "4.18",
    "4.19"
]
def clientConnectHash = ""
if (env.CHANGE_TARGET != null) {
    stage("Confirm") {
        input "Approve this PR build to run? Check the PR first!"
    }
}
stage("Setup") {
    def parallelMap = [:]
    parallelMap["Checkout"] = {
        node('linux') {
            gitCommit = checkout(poll: false, changelog: false, scm: scm).GIT_COMMIT
            sh ('echo ' + gitCommit)
            sh 'git clean -xdf'
            sh 'git submodule update --init --recursive'
            sh 'git submodule foreach --recursive git clean -xdf'
            sdkVersion = readFile 'SdkVersion.txt'
            sdkVersion = sdkVersion.trim()
            sh 'echo "$(git log --format="format:%H" -1 --follow client_connect/)-$(git log --format="format:%H" -1 --follow Jenkinsfile)-$GIT_BRANCH" > cchash'
            clientConnectHash = sha1 ('cchash')
        }
    }
    parallelMap["Windows Node"] = {
        node('windows-hispeed') {
            timeout(20) {
            }
        }
    }
    parallel (parallelMap)
}
def clientConnectCaches = [
    "Win32",
    "Win64",
    "Mac64",
    "Linux32",
    "Linux64"
]
def preloaded = [:]
stage("Load Caches") {
    def sdkPrefix = ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk')
    node('windows-hispeed') {
        if (clientConnectHash != "") {
            clientConnectCaches.each {
                try {
                    googleStorageDownload bucketUri: (sdkPrefix + '/' + it + '/*'), credentialsId: 'redpoint-games-build-cluster', localDirectory: ('client_connect/sdk/' + it + '/'), pathPrefix: (clientConnectHash + '/sdk/' + it + '/')
                    stash includes: ('client_connect/sdk/' + it + '/**'), name: ('cc_sdk_' + it)
                    preloaded[it] = true;
                } catch (all) {
                    preloaded[it] = false;
                }
            }
        }
    }
}
stage("Build Client Connect") {
    def parallelMap = [:]
    parallelMap["Windows"] = {
        if (!preloaded["Win32"] || !preloaded["Win64"]) {
            node('windows-hispeed') {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    bat 'git clean -xdf'
                    bat 'git submodule update --init --recursive'
                    bat 'git submodule foreach --recursive git clean -xdf'
                    bat 'yarn'
                    bat 'pwsh client_connect\\Build-Init.ps1'
                    def parallelArchMap = [:]
                    parallelArchMap["Win32"] = {
                        if (!preloaded["Win32"]) {
                            bat 'pwsh client_connect\\Build-Arch.ps1 Win32'
                            googleStorageUpload bucket: ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk/Win32'), credentialsId: 'redpoint-games-build-cluster', pattern: 'client_connect/sdk/Win32/**'
                            stash includes: ('client_connect/sdk/Win32/**'), name: 'cc_sdk_Win32'
                        }
                    }
                    parallelArchMap["Win64"] = {
                        if (!preloaded["Win64"]) {
                            bat 'pwsh client_connect\\Build-Arch.ps1 Win64'
                            googleStorageUpload bucket: ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk/Win64'), credentialsId: 'redpoint-games-build-cluster', pattern: 'client_connect/sdk/Win64/**'
                            stash includes: ('client_connect/sdk/Win64/**'), name: 'cc_sdk_Win64'
                        }
                    }
                    parallel (parallelArchMap)
                }
            }
        }
    };
    parallelMap["macOS"] = {
        node('mac') {
            if (!preloaded["Mac64"]) {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    sh 'git clean -xdf'
                    sh 'git submodule update --init --recursive'
                    sh 'git submodule foreach --recursive git clean -xdf'
                    sh 'yarn'
                    sh 'pwsh client_connect/Build-Init.ps1'
                    sh 'pwsh client_connect/Build-Arch.ps1 Mac64'
                    googleStorageUpload bucket: ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk/Mac64'), credentialsId: 'redpoint-games-build-cluster', pattern: 'client_connect/sdk/Mac64/**'
                    stash includes: ('client_connect/sdk/Mac64/**'), name: 'cc_sdk_Mac64'
                }
            }
        }
    };
    parallelMap["Linux"] = {
        node('linux') {
            if (!preloaded["Linux32"] || !preloaded["Linux64"]) {
                timeout(20) {
                    checkout(poll: false, changelog: false, scm: scm)
                    sh 'git clean -xdf'
                    sh 'git submodule update --init --recursive'
                    sh 'git submodule foreach --recursive git clean -xdf'
                    sh 'yarn'
                    sh 'pwsh client_connect/Build-Init.ps1'
                    def parallelArchMap = [:]
                    parallelArchMap["Linux32"] = {
                        if (!preloaded["Linux32"]) {
                            sh 'pwsh client_connect/Build-Arch.ps1 Linux32'
                            googleStorageUpload bucket: ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk/Linux32'), credentialsId: 'redpoint-games-build-cluster', pattern: 'client_connect/sdk/Linux32/**'
                            stash includes: ('client_connect/sdk/Linux32/**'), name: 'cc_sdk_Linux32'
                        }
                    }
                    parallelArchMap["Linux64"] = {
                        if (!preloaded["Linux64"]) {
                            sh 'pwsh client_connect/Build-Arch.ps1 Linux64'
                            googleStorageUpload bucket: ('gs://redpoint-build-cache/' + clientConnectHash + '/sdk/Linux64'), credentialsId: 'redpoint-games-build-cluster', pattern: 'client_connect/sdk/Linux64/**'
                            stash includes: ('client_connect/sdk/Linux64/**'), name: 'cc_sdk_Linux64'
                        }
                    }
                    parallel (parallelArchMap)
                }
            }
        }
    };
    parallel (parallelMap)
}
node('windows-hispeed') {
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
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version] =
            {
                timeout(5) {
                    bat 'yarn run generator generate --client-connect-sdk-path client_connect/sdk -c UnrealEngine-' + version + ' dist/UnrealEngine-' + version
                }
            };
        }
        parallel (parallelMap)
    }
    stage("Package") {
        def parallelMap = [:]
        parallelMap["CSharp"] = {
            timeout(10) {
                bat 'pwsh util/Fetch-NuGet-4.5.ps1'
                bat ('cd dist/CSharp-4.5 && nuget pack -Version ' + sdkVersion + '.%BUILD_NUMBER% -NonInteractive HiveMP.nuspec')
            }
        };
        parallelMap["Unity"] = {
            timeout(10) {
                bat ('pwsh util/Unity-PrePackage.ps1 -SdkVersion ' + sdkVersion)
                stash includes: ('Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip'), name: 'unitysdk'
                bat ('pwsh util/Unity-PostPackage.ps1 -SdkVersion ' + sdkVersion)
                stash includes: ('Unity-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.unitypackage'), name: 'unitypackage'
            }
        };
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version] =
            {
                timeout(10) {
                    bat ('pwsh util/UE4-Package.ps1 -UeVersion ' + version + ' -SdkVersion ' + sdkVersion)
                    stash includes: ('UnrealEngine-' + version + '-SDK.' + sdkVersion + '.' + env.BUILD_NUMBER + '.zip'), name: 'ue' + version.replace(/\./, '') + 'sdk'
                }
            };
        }
        parallel (parallelMap)
    }
    stage("Build Tests") {
        def parallelMap = [:]
        supportedUnityVersions.each { v ->
            def version = v
            parallelMap["Unity-" + version] =
            {
                timeout(60) {
                    bat 'pwsh tests/Build-UnityTests.ps1 -Version ' + version
                }
                timeout(10) {
                    if (version == "5.4.1f" || version == "2017.1.1f1" || version == "2017.2.0f3") {
                        stash includes: 'tests/UnityBuilds-' + version + '/Linux32/**', name: 'unity-' + version + '-test-linux32'
                    }
                    stash includes: 'tests/UnityBuilds-' + version + '/Linux64/**', name: 'unity-' + version + '-test-linux64'
                    if (version == "5.4.1f" || version == "2017.1.1f1" || version == "2017.2.0f3") {
                        stash includes: 'tests/UnityBuilds-' + version + '/Mac32/**', name: 'unity-' + version + '-test-mac32'
                    }
                    stash includes: 'tests/UnityBuilds-' + version + '/Mac64/**', name: 'unity-' + version + '-test-mac64'
                    stash includes: 'tests/UnityBuilds-' + version + '/Win32/**', name: 'unity-' + version + '-test-win32'
                    stash includes: 'tests/UnityBuilds-' + version + '/Win64/**', name: 'unity-' + version + '-test-win64'
                    stash includes: 'tests/*.ps1', name: 'unity-' + version + '-test-script'
                }
            };
        }
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version] =
            {
                lock(resource: "SDK_" + env.NODE_NAME, inversePrecedence: true) {
                    timeout(120) {
                        bat 'pwsh tests/Build-UE4Tests.ps1 -Version ' + version
                    }
                }
                timeout(10) {
                    stash includes: 'tests/UnrealBuilds-' + version + '/Win32/**', name: 'unreal-' + version + '-test-win32'
                    stash includes: 'tests/UnrealBuilds-' + version + '/Win64/**', name: 'unreal-' + version + '-test-win64'
                    stash includes: 'tests/*.ps1', name: 'unreal-' + version + '-test-script'
                }
            };
        }
        parallel (parallelMap)
    }
    stage("Run Tests") {
        def parallelMap = [:]
        supportedUnityVersions.each { v ->
            def version = v
            if (version == "5.4.1f" || version == "2017.1.1f1" || version == "2017.2.0f3") {
                parallelMap["Unity-" + version + "-Mac32"] =
                {
                    node('mac') {
                        timeout(30) {
                            unstash 'unity-' + version + '-test-mac32'
                            unstash 'unity-' + version + '-test-script'
                            sh 'chmod a+x tests/Run-UnityTest.ps1'
                            sh 'chmod -R a+rwx tests/UnityBuilds-' + version + '/'
                            sh 'perl -pi -e \'s/\\r\\n|\\n|\\r/\\n/g\' tests/Run-UnityTest.ps1'
                            sh 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Mac32'
                        }
                    }
                };
            }
            parallelMap["Unity-" + version + "-Mac64"] =
            {
                node('mac') {
                    timeout(30) {
                        unstash 'unity-' + version + '-test-mac64'
                        unstash 'unity-' + version + '-test-script'
                        sh 'chmod a+x tests/Run-UnityTest.ps1'
                        sh 'chmod -R a+rwx tests/UnityBuilds-' + version + '/'
                        sh 'perl -pi -e \'s/\\r\\n|\\n|\\r/\\n/g\' tests/Run-UnityTest.ps1'
                        sh 'tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Mac64'
                    }
                }
            };
            parallelMap["Unity-" + version + "-Win32"] =
            {
                node('windows') {
                    timeout(30) {
                        unstash 'unity-' + version + '-test-win32'
                        unstash 'unity-' + version + '-test-script'
                        bat 'pwsh tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Win32'
                    }
                }
            };
            parallelMap["Unity-" + version + "-Win64"] =
            {
                node('windows') {
                    timeout(30) {
                        unstash 'unity-' + version + '-test-win64'
                        unstash 'unity-' + version + '-test-script'
                        bat 'pwsh tests/Run-UnityTest.ps1 -Version ' + version + ' -Platform Win64'
                    }
                }
            };
        }
        supportedUnrealVersions.each { v ->
            def version = v
            parallelMap["UnrealEngine-" + version + "-Win32"] =
            {
                node('windows') {
                    timeout(30) {
                        unstash 'unreal-' + version + '-test-win32'
                        unstash 'unreal-' + version + '-test-script'
                        bat 'pwsh tests/Run-UE4Test.ps1 -Version ' + version + ' -Platform Win32'
                    }
                }
            };
            if (version == "4.18") {
                parallelMap["UnrealEngine-" + version + "-Win64"] =
                {
                    node('windows') {
                        timeout(30) {
                            unstash 'unreal-' + version + '-test-win64'
                            unstash 'unreal-' + version + '-test-script'
                            bat 'pwsh tests/Run-UE4Test.ps1 -Version ' + version + ' -Platform Win64'
                        }
                    }
                };
            }
        }
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
}