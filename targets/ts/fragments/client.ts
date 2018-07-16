export function clientPrefix(values: {
  tag: string,
  apiName: string,
  apiId: string,
  apiBasePath: string
}) {
  return `
  export class ${values.tag}Client {
    /**
     * The API key to use in HiveMP requests.
     */
    public apiKey: string;

    /**
     * The base URL for requests.
     */
    public baseUrl: string;

    constructor(apiKey?: string) {
      this.apiKey = apiKey === undefined ? '' : apiKey;
      this.baseUrl = "https://${values.apiId}-api.hivemp.com${values.apiBasePath}";
    }

`;
}

export const clientSuffix = `
    }
`;