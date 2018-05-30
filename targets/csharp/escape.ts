import * as xmlescape from 'xml-escape';

export function escapeForXmlComment(s: string, i: string): string {
  if (s == null) {
    return "";
  }
  return xmlescape(s).replace(/(?:\r\n|\r|\n)/g, "\n" + i);
}