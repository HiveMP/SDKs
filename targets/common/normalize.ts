export function normalizeTypeName(s: string): string {
  return s.replace(/(\[|\])/g, '');
}

export function normalizeWebSocketProtocolName(s: string): string {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '-' && i < s.length - 1) {
      s = s.slice(0, i) + s.substr(i + 1, 1).toUpperCase() + s.slice(i + 2);
    }
  }

  return s.replace(/(\[|\])/g, '');
}