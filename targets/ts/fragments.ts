export { clientPrefix, clientSuffix } from './fragments/client';
export { implementationMethodDeclarations } from './fragments/methods';

export const nodeJsHeader = `
import * as superagent from 'superagent';
import * as moment from 'moment';
`;

export function namespaceBegin(namespace: string) {
  return `
export namespace ${namespace}
{
`;
}

export const namespaceEnd = `
}
`