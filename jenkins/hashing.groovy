def hashEntries(version, entries) {
  def id = UUID.randomUUID().toString()
  try {
    sh ('echo "' + version + '-$BRANCH_NAME" > ' + id + '_hash')
    entries.each { entry -> 
      sh ('echo "$(git log --format="format:%H" -1 --follow "' + entry + '")" >> ' + id + '_hash')
    }
    return sha1(id + '_hash')
  } finally {
    sh ('rm ' + id + '_hash')
  }
}

def hashEntriesEx(version, entries, extra) {
  def id = UUID.randomUUID().toString()
  try {
    sh ('echo "' + version + '-$BRANCH_NAME" > ' + id + '_hash')
    entries.each { entry -> 
      sh ('echo "$(git log --format="format:%H" -1 --follow "' + entry + '")" >> ' + id + '_hash')
    }
    extra.each { entry -> 
      sh ('echo "' + entry + '" > ' + id + '_hash')
    }
    return sha1(id + '_hash')
  } finally {
    sh ('rm ' + id + '_hash')
  }
}

def sha1String(str) {
  def id = UUID.randomUUID().toString()
  writeFile file: 'hash_' + id, text: str
  def result = sha1('hash_' + id);
  if (isUnix()) {
    sh ('rm hash_' + id)
  } else {
    bat ('pwsh -Command "rm hash_' + id + '"')
  }
  return result
}

return this