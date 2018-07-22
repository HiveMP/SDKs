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