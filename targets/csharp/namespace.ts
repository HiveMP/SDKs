export function generateCSharpNamespace(apiId: string, document: any) {
  const csharpName = document.info["x-sdk-csharp-package-name"];
  return csharpName + '.Api';
}