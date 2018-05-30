export function interfacePrefix(tag: string) {
  return `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public interface I${tag}Client
    {
        /// <summary>
        /// The API key sent in requests to HiveMP.  When calling methods that require no API key, this should be null, otherwise set it to the API key.
        /// </summary>
        string ApiKey { get; set; }
        
        /// <summary>
        /// The base URL for the API. This is set to production for you by default, but if want to use development or enterprise endpoints, you'll need to set this.
        /// </summary>
        string BaseUrl { get; set; }
    
        /// <summary>
        /// Called when preparing an API request; you can use this event to modify where the request is sent.
        /// </summary>
        System.Func<HiveMP.Api.RetryableHttpClient, string, string> InterceptRequest { get; set; }
`;
}

export const interfaceSuffix = `
    }
`;