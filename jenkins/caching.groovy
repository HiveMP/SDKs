def hasCache(gcloud, hash, id) {
  return gcloud.keyExists('cache-' + hash + '-' + id);
}

def checkPreloaded(gcloud, preloaded, hash, id, title) {
  if (hasCache(gcloud, hash, id)) {
    preloaded[id] = true;
    echo ('Preloadable ' + title + ' is already cached in Google Cloud')
  } else {
    preloaded[id] = false;
    echo ('Preloadable ' + title + ' is NOT cached in Google Cloud, will build this run...')
  }
}

def checkMultiplePreloaded(gcloud, preloaded, hash, pid, ids, title) {
  def allInCache = true;
  ids.each { id -> 
    if (!this.hasCache(gcloud, hash, id)) {
      allInCache = false;
    }
  }
  if (allInCache) {
    preloaded[pid] = true;
    echo ('Preloadable ' + title + ' is already cached in Google Cloud')
  } else {
    preloaded[pid] = false;
    echo ('Preloadable ' + title + ' is NOT cached in Google Cloud, will build this run...')
  }
}

def pullCacheDirectory(gcloud, hash, id, dir, targetType) {
  pullCacheDirectoryMultiple(gcloud, hash, [
    [
      id: id,
      dir: dir,
      targetType: targetType,
    ]
  ])
}

def pullCacheDirectoryMultiple(gcloud, hash, entries) {
  if (env.NODE_NAME.startsWith("windows-")) {
    // This is running in Google Cloud, so we just pull the cache
    // directly onto the agent without going via Jenkins.
    gcloud.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
      entries.each { entry ->
        def normDir = entry.dir.replaceAll('^/+', '').replaceAll('/+$', '');
        def targetDir = normDir;
        if (!isUnix()) {
          targetDir = normDir.replaceAll("/","\\\\");
        } 
        def recurArg = '-r';
        try {
          if (entry.targetType == 'file') {
            recurArg = '';
            bat ('set filename="' + targetDir + '''"
for %%F in (%filename%) do set dirname=%%~dpF
mkdir "%dirname%"''')
          } else if (entry.targetType == 'dir') {
            bat ('mkdir "' + targetDir + '"')
          }
        } catch (e) { }
        bat ('gsutil -m cp ' + recurArg + ' "gs://redpoint-build-cache/' + hash + '/' + normDir + '" "' + targetDir + '"')
      }
    }
  } else {
    entries.each { entry -> 
      def normDir = entry.dir.replaceAll('^/+', '').replaceAll('/+$', '');
      def targetDir = normDir;
      if (!isUnix()) {
        targetDir = normDir.replaceAll("/","\\\\");
      } 

      // Try to unstash first in case Jenkins has already cached this.
      def wasUnstashSuccessful = false
      try {
        unstash name: ('cache-' + hash + '-' + entry.id)
        wasUnstashSuccessful = true
      } catch (e) {
        wasUnstashSuccessful = false
      }

      if (wasUnstashSuccessful) {
        // Jenkins hasn't got a copy of this yet.
        googleStorageDownload bucketUri: ('gs://redpoint-build-cache/' + hash + '/' + normDir + '/*'), credentialsId: 'redpoint-games-build-cluster', localDirectory: (normDir + '/'), pathPrefix: (hash + '/' + normDir + '/')
        stash includes: ('client_connect/sdk/' + it + '/**'), name: ('cache-' + hash + '-' + entry.id)

        // We have just implicitly unstashed on this node, so nothing more to do here.
      }
    }
  }
}

def pushCacheDirectory(gcloud, hash, id, dir) {
  dir = dir.replaceAll('^/+', '').replaceAll('/+$', '');
  def targetDir = dir;
  if (!isUnix()) {
    targetDir = dir.replaceAll("/","\\\\");
  }
  if (env.NODE_NAME.startsWith("windows-")) {
    // This is running in Google Cloud, so we just push the cache
    // directly onto the agent without going via Jenkins.
    gcloud.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
      bat ('gsutil -m cp -r "' + targetDir + '" "gs://redpoint-build-cache/' + hash + '/' + dir + '"')
    }
    gcloud.keySet('cache-' + hash + '-' + id, 'true')
  } else {
    // Push from the agent via Jenkins.
    googleStorageUpload bucket: ('gs://redpoint-build-cache/' + hash), credentialsId: 'redpoint-games-build-cluster', pattern: (dir + '/**')
    gcloud.keySet('cache-' + hash + '-' + id, 'true')

    // Now also stash the result so we can pull it later on Jenkins agents faster
    stash includes: (dir + '/**'), name: ('cache-' + hash + '-' + id)
  }
}

return this