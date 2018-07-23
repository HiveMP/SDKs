import groovy.transform.Field

@Field Map<String, Boolean> gcloudKvInstalled = [:]

def wrap(java.util.LinkedHashMap config, org.jenkinsci.plugins.workflow.cps.CpsClosure2 block) {
    def id = UUID.randomUUID().toString();
    def cwd = pwd();
    def unix = isUnix();
    def gcloudDir = '.gcloud' + id;
    if (unix) {
        sh ('mkdir "' + gcloudDir + '"')
    } else {
        powershell 'try { New-Item -Path "' + gcloudDir + '" -ItemType Directory } catch { }'
    }
    try {
        def cloudSdkPath = cwd + '/' + gcloudDir;
        def botoPath = cwd + '/' + gcloudDir + '/boto.cfg';
        def svcPath = cwd + '/' + gcloudDir + '/serviceaccount.json';
        if (!unix) {
            cloudSdkPath = cwd + '\\' + gcloudDir;
            botoPath = cwd + '\\' + gcloudDir + '\\boto.cfg';
            svcPath = cwd + '\\' + gcloudDir + '\\serviceaccount.json';
        }
        withEnv(['CLOUDSDK_CONFIG=' + cloudSdkPath, 'BOTO_CONFIG=' + botoPath, 'GOOGLE_APPLICATION_CREDENTIALS=' + svcPath]) {
            // Copy the service account JSON file to our Google Cloud config directory (so it doesn't
            // get deleted once withCredentials goes out of scope).
            if (config["serviceAccountCredential"] != null) {
                withCredentials([file(credentialsId: config["serviceAccountCredential"], variable: 'SERVICE_ACCOUNT_JSON')]) {
                    if (unix) {
                        sh 'cp "$SERVICE_ACCOUNT_JSON" "$CLOUDSDK_CONFIG/serviceaccount.json"'
                    } else {
                        powershell 'Copy-Item -Force "$env:SERVICE_ACCOUNT_JSON" "$env:CLOUDSDK_CONFIG\\serviceaccount.json"'
                    }
                }
            } else if (config["serviceAccountPath"] != null) {
                withEnv(['SERVICE_ACCOUNT_JSON=' + config["serviceAccountPath"]]) {
                    if (unix) {
                        sh 'cp "$SERVICE_ACCOUNT_JSON" "$CLOUDSDK_CONFIG/serviceaccount.json"'
                    } else {
                        powershell 'Copy-Item -Force "$env:SERVICE_ACCOUNT_JSON" "$env:CLOUDSDK_CONFIG\\serviceaccount.json"'
                    }
                }
            }

            // Set up service account authentication in the temporary Google Cloud config path.
            if (unix) {
                sh 'gcloud config set pass_credentials_to_gsutil false'
                sh 'echo "$CLOUDSDK_CONFIG/serviceaccount.json" | gsutil config -e -o "$BOTO_CONFIG"'
                sh 'gcloud auth activate-service-account --key-file="$CLOUDSDK_CONFIG/serviceaccount.json"'
            } else {
                bat 'gcloud config set pass_credentials_to_gsutil false'
                powershell '$ErrorActionPreference = "SilentlyContinue"; try { New-Item -Path "$env:USERPROFILE\\.gsutil" -ItemType Directory; } catch { }; Write-Output "$env:CLOUDSDK_CONFIG\\serviceaccount.json" | gsutil config -e -o "$env:BOTO_CONFIG" 2>&1; if ($LastExitCode -ne 0) { exit 1; };'
                bat 'gcloud auth activate-service-account --key-file="%CLOUDSDK_CONFIG%\\serviceaccount.json"'
            }

            // Invoke the closure block that the user wants to execute, with the CLOUDSDK_CONFIG
            // and BOTO_CONFIG environment variables set.
            block()
        }
    } finally {
        dir(cwd) {
            if (unix) {
                sh ('rm -Rf "' + gcloudDir + '"')
            } else {
                powershell 'Remove-Item -Force -Recurse "' + gcloudDir + '"'
            }
        }
    }
}

def installGCloudKvIfNeeded() {
    if (!this.gcloudKvInstalled.containsKey(env.NODE_NAME)) {
        if (isUnix()) {
            sh 'yarn global add @redpointgames/gcloud-kv@0.3.5'
        } else {
            bat 'npm i -g @redpointgames/gcloud-kv@0.3.5'
        }
        this.gcloudKvInstalled[env.NODE_NAME] = true
    }
}

def keyExists(key) {
    this.installGCloudKvIfNeeded()
    this.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
        if (isUnix()) {
            def exitCode = sh(returnStatus: true, script: 'gcloud-kv -p redpoint-games-build-cluster exists "' + key + '"')
            if (exitCode == 0) {
                return true;
            } else if (exitCode == 1) {
                return false;
            } else {
                error("'gcloud-kv exists' was unable check the key existance, refer to error message above");
            }
        } else {
            def exitCode = bat(returnStatus: true, script: 'gcloud-kv -p redpoint-games-build-cluster exists "' + key + '"')
            if (exitCode == 0) {
                return true;
            } else if (exitCode == 1) {
                return false;
            } else {
                error("'gcloud-kv exists' was unable check the key existance, refer to error message above");
            }
        }
    }
}

def keyGet(key) {
    this.installGCloudKvIfNeeded()
    this.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        }
    }
}

def keySet(key, value) {
    this.installGCloudKvIfNeeded()
    this.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster set "' + key + '" "' + value + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster set "' + key + '" "' + value + '"')).trim()
        }
    }
}

def keyDelete(key) {
    this.installGCloudKvIfNeeded()
    this.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        }
    }
}

return this