export function stripDefinition(s: string): string {
  if (s.startsWith('#/definitions/')) {
    return s.substr('#/definitions/'.length);
  }
  return s;
}