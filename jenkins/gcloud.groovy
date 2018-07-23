import groovy.transform.Field

@Field Map<String, Boolean> gcloudKvInstalled = [:]

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
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
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
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '"')).trim()
        }
    }
}

def keySet(key, value) {
    this.installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '" "' + value + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster get "' + key + '" "' + value + '"')).trim()
        }
    }
}

def keyDelete(key) {
    this.installGCloudKvIfNeeded()
    withCredentials([file(credentialsId: 'jenkins-vm-gcloud', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (isUnix()) {
            return (sh(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        } else {
            return (bat(returnStdout: true, script: 'gcloud-kv -p redpoint-games-build-cluster delete "' + key + '"')).trim()
        }
    }
}

return this