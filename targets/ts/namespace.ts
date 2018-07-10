export function generateTypeScriptNamespace(apiId: string, document: any) {
  let csharpName = document.info["x-sdk-csharp-package-name"] as string;
  if (csharpName.startsWith('HiveMP.')) {
    csharpName = csharpName.substring('HiveMP.'.length);
  }
  return csharpName;
}