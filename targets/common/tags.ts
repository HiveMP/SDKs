export function loadTags(apiId: string, document: any, namespace: string): Set<string> {
  const set = new Set<string>();
  for (const pathName in document.paths) {
    const pathValue = document.paths[pathName];
    for (const methodName in pathValue) {
      const methodValue = pathValue[methodName];
      const tag: string = methodValue.tags[0];
      set.add(tag);
    }
  }
  return set;
}