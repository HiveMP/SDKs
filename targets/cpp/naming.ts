export function avoidConflictingCPlusPlusNames(s: string): string {
  if (s == 'template') {
    return 'template_';
  }
  return s;
}