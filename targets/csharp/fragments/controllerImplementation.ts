export function implementationPrefix(values: {
    genericNamespace: string,
  tag: string,
  startupCode: string,
  apiName: string,
  apiId: string,
  apiBasePath: string
}) {
  return `
  
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public class ${values.tag}Client : I${values.tag}Client, ${values.genericNamespace}.IHiveMPBaseClient
    {
        ${values.startupCode}
  
        /// <summary>
        /// The API key sent in requests to HiveMP.  When calling methods that require no API key, this should
        /// be null, otherwise set it to the API key.
        /// </summary>
        public string ApiKey { get; set; }
  
        /// <summary>
        /// A factory which returns the API key request on demand. You can use this
        /// property instead of ApiKey if you need to dynamically update the API key
        /// per request. If this is non-null, the value of ApiKey is ignored.
        /// </summary>
        public System.Func<string> ApiKeyFactory { get; set; }

        /// <summary>
        /// If set, this handler is called to convert the native HiveMP exception into another exception.
        /// </summary>
        public System.Func<${values.genericNamespace}.HiveMPException, System.Exception> ExceptionConverter { get; set; }
    
        /// <summary>
        /// The base URL for the API. This is set to production for you by default, but if want to use development or
        /// enterprise endpoints, you'll need to set this.
        /// </summary>
        public string BaseUrl { get; set; }
    
        /// <summary>
        /// Called when preparing an API request; you can use this event to modify where the
        /// request is sent.
        /// </summary>
        public System.Func<${values.genericNamespace}.RetryableHttpClient, string, string> InterceptRequest { get; set; }
        
        private System.Exception ConvertException(${values.genericNamespace}.HiveMPException ex)
        {
            if (ExceptionConverter != null)
            {
                return ExceptionConverter(ex);
            }
            else
            {
                return ex;
            }
        }

        private void PrepareRequest(${values.genericNamespace}.RetryableHttpClient request, string url)
        {
            if (ApiKeyFactory != null)
            {
                request.DefaultRequestHeaders.Add("X-API-Key", ApiKeyFactory() ?? string.Empty);
            }
            else
            {
                request.DefaultRequestHeaders.Add("X-API-Key", ApiKey ?? string.Empty);
            }
        }
  
        private void PrepareRequest(${values.genericNamespace}.RetryableHttpClient request, System.Text.StringBuilder urlBuilder)
        {
            if (InterceptRequest != null)
            {
                var url = urlBuilder.ToString();
                var newUrl = InterceptRequest(request, url);
                urlBuilder.Remove(0, urlBuilder.Length);
                urlBuilder.Append(newUrl);
            }
        }
  
        /// <summary>
        /// Constructs a new ${values.tag}Client for calling the ${values.apiName} API.
        /// </summary>
        /// <param name="apiKey">The HiveMP API key to use.</param>
        public ${values.tag}Client(string apiKey)
        {
            ApiKey = apiKey;
            BaseUrl = "https://${values.apiId}-api.hivemp.com${values.apiBasePath}";
        }
  
        /// <summary>
        /// Constructs a new ${values.tag}Client for calling the ${values.apiName} API, with a default empty API key.
        /// </summary>
        public ${values.tag}Client()
        {
            ApiKey = string.Empty;
            BaseUrl = "https://${values.apiId}-api.hivemp.com${values.apiBasePath}";
        }

`;
}

export const implementationSuffix = `
    }
`;