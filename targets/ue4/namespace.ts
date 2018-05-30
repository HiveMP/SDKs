export function generateUe4Namespace(apiId: string, document: any) {
  return apiId.replace(/-/g, '_');
}