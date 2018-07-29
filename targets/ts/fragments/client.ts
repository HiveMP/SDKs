export function clientPrefix(values: {
  tag: string,
  apiName: string,
  apiId: string,
  apiBasePath: string
}) {
  return `
  export class ${values.tag}Client implements IHiveMPClient {
    /**
     * The method that returns the API key to use in the request.
     */
    public apiKeyFactory: () => string;

    /**
     * The base URL factory for requests.
     */
    public baseUrlFactory: () => string;

    public getOriginalApiId: () => string = () => "${values.apiId}";

    public getOriginalBasePath: () => string = () => "${values.apiBasePath}";

    constructor(apiKey?: (string | (() => string))) {
      if (apiKey === undefined) {
        this.apiKeyFactory = () => '';
      } else if (typeof apiKey === 'string') {
        this.apiKeyFactory = () => apiKey;
      } else {
        this.apiKeyFactory = apiKey;
      }
      this.baseUrlFactory = () => "https://${values.apiId}-api.hivemp.com${values.apiBasePath}";
    }

`;
}

export const clientSuffix = `
    }
`;