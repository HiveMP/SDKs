export function generateCSharpNamespace(apiId: string, apiVersion: string, document: any) {
  const csharpName = document.info["x-sdk-csharp-package-name"];
  if (apiVersion == 'v1') {
    return csharpName + '.v1.Api';
  } else {
    return csharpName + '.v' + apiVersion.replace(/-/g, '') + '.Api';
  }
}