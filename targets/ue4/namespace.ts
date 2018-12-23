export function generateUe4Namespace(apiId: string, apiVersion: string, document: any) {
  return apiId.replace(/-/g, '_');
}