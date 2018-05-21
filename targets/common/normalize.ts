export function normalizeTypeName(s: string): string {
  return s.replace(/(\[|\])/g, '');
}