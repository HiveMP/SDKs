def gcloudKvInstalled = [:]
def installGCloudKvIfNeeded() {
    if (!gcloudKvInstalled.containsKey(env.NODE_NAME)) {
        if (isUnix()) {
            sh 'npm i -g @redpointgames/gcloud-kv@0.3.3'
        } else {
            bat 'npm i -g @redpointgames/gcloud-kv@0.3.3'
        }
        gcloudKvInstalled[env.NODE_NAME] = true
    }
}

def keyExists(key) {
    installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            def exitCode = sh(returnStatus: true, script: 'gcloud-kv -p redpoint-games-build-cluster exists "' + key + '"')
            return exitCode == 0
        } else {
            def exitCode = bat(returnStatus: true, script: 'gcloud-kv -p redpoint-games-build-cluster exists "' + key + '"')
            return exitCode == 0
        }
    }
}

def keyGet(key) {
    installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        }
    }
}

def keySet(key, value) {
    installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '" "' + value + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '" "' + value + '"')).trim()
        }
    }
}

def keyDelete(key) {
    installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        }
    }
}

return this