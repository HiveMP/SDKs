export function namespaceBegin(namespace: string) {
  return `
namespace ${namespace}
{
    #pragma warning disable // Disable all warnings
`;
}

export const namespaceEnd = `
}
`