export function escapeForMultilineComment(input: string): string {
  return input;
}

export function escapeForDoubleQuotedString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/\"/g, '\\"').replace(/(?:\r\n|\r|\n)/g, '\\n');
}