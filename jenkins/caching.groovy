def hasCache(gcloud, hash, id) {
  return gcloud.keyExists('cache-zipped-' + hash + '-' + id);
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

def pullCacheDirectory(gcloud, hashing, hash, id, dir, targetType) {
  pullCacheDirectoryMultiple(gcloud, hashing, hash, [
    [
      id: id,
      dir: dir,
      targetType: targetType,
    ]
  ])
}

def pullEntriesInWrappedContext(entry, unix, hash, targetDir, normDir, dirHash) {
  if (unix) {
    try {
      if (entry.targetType == 'file') {
        recurArg = '';
        sh ('mkdir -pv "$(dirname "' + targetDir + '")"')
      } else if (entry.targetType == 'dir') {
        sh ('mkdir -pv "' + targetDir + '"')
      }
    } catch (e) { }
    sh ('gsutil cp "gs://redpoint-build-cache/zipped-' + hash + '/' + dirHash + '.zip" "_cache_store_' + dirHash + '.zip"')
    sh ('pwsh -Command "Expand-Archive -Path _cache_store_' + dirHash + '.zip -DestinationPath \'$(dirname "' + targetDir + '")/\'"')
  } else {
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
    bat ('set filename="' + targetDir + '''"
for %%F in (%filename%) do set dirname=%%~dpF
gsutil cp "gs://redpoint-build-cache/zipped-''' + hash + '/' + dirHash + '.zip" "_cache_store_' + dirHash + '''.zip"
pwsh -Command "Expand-Archive -Path _cache_store_''' + dirHash + '.zip  -DestinationPath $env:dirname"')
  }
}

def pullCacheDirectoryMultiple(gcloud, hashing, hash, entries) {
  def unix = isUnix();

  if (env.NODE_NAME.startsWith("windows-")) {
    // This is running in Google Cloud, so we just pull the cache
    // directly onto the agent without going via Jenkins.
    gcloud.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
      entries.each { entry ->
        def normDir = entry.dir.replaceAll('^/+', '').replaceAll('/+$', '');
        def targetDir = normDir;
        if (!unix) {
          targetDir = normDir.replaceAll("/","\\\\");
        }
        def dirHash = hashing.sha1String(normDir);

        pullEntriesInWrappedContext(entry, unix, hash, targetDir, normDir, dirHash)
      }
    }
  } else {
    entries.each { entry -> 
      def normDir = entry.dir.replaceAll('^/+', '').replaceAll('/+$', '');
      def targetDir = normDir;
      if (!unix) {
        targetDir = normDir.replaceAll("/","\\\\");
      } 
      def dirHash = hashing.sha1String(normDir);

      // Try to unstash first in case Jenkins has already cached this.
      def wasUnstashSuccessful = false
      try {
        unstash name: ('cache-zipped-' + hash + '-' + entry.id)
        wasUnstashSuccessful = true
      } catch (e) {
        wasUnstashSuccessful = false
      }

      if (!wasUnstashSuccessful) {
        // Jenkins hasn't got a copy of this yet.
        gcloud.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
          pullEntriesInWrappedContext(entry, unix, hash, targetDir, normDir, dirHash)
        }
        if (entry.targetType == 'file') {
          stash includes: normDir, name: ('cache-zipped-' + hash + '-' + entry.id)
        } else {
          stash includes: (normDir + '/**'), name: ('cache-zipped-' + hash + '-' + entry.id)
        }

        // We have just implicitly unstashed on this node, so nothing more to do here.
      }
    }
  }
}

def pushCacheDirectory(gcloud, hashing, hash, id, dir) {
  dir = dir.replaceAll('^/+', '').replaceAll('/+$', '');
  def targetDir = dir;
  def unix = isUnix();
  if (!unix) {
    targetDir = dir.replaceAll("/","\\\\");
  }
  def dirHash = hashing.sha1String(dir);

  gcloud.wrap(serviceAccountCredential: 'jenkins-vm-gcloud') {
    if (unix) {
      sh ('pwsh -Command "Compress-Archive -Path \'' + targetDir + '\' -DestinationPath _cache_store_' + dirHash + '.zip -CompressionLevel NoCompression"')
    } else {
      bat ('pwsh -Command "Compress-Archive -Path \'' + targetDir + '\' -DestinationPath _cache_store_' + dirHash + '.zip -CompressionLevel NoCompression"')
    }
    bat ('gsutil cp "_cache_store_' + dirHash + '.zip" "gs://redpoint-build-cache/zipped-' + hash + '/' + dirHash + '.zip"')
    gcloud.keySet('cache-zipped-' + hash + '-' + id, 'true')

    if (!env.NODE_NAME.startsWith("windows-")) {
      // Also stash if the node is a local node.
      stash includes: ('_cache_store_' + dirHash + '.zip'), name: ('cache-zipped-' + hash + '-' + id)
    }
  });
}

return this