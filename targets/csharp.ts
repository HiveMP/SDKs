import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlescape from 'xml-escape';
import { TargetGenerator, GeneratorUtility } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";

abstract class CSharpGenerator implements TargetGenerator {
  abstract get name(): string;

  abstract getDefines(): string;

  async postGenerate(opts: TargetOptions): Promise<void> {
    if (opts.enableClientConnect) {
      // Copy Client Connect SDK binaries.
      const copyClientConnectPlatformBinaries = async (platform: string) => {
        await new Promise<void>((resolve, reject) => {
          fs.mkdirp(opts.outputDir + "/" + platform, (err) => {
            if (err) {
              reject(err);
            }
            let src = "deps/HiveMP.ClientConnect/" + platform;
            if (opts.clientConnectSdkPath != null) {
              src = opts.clientConnectSdkPath + "/" + platform;
            }
            fs.copy(src, opts.outputDir + "/" + platform, { overwrite: true }, (err) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
        });
      }
      await copyClientConnectPlatformBinaries("Win32");
      await copyClientConnectPlatformBinaries("Win64");
      await copyClientConnectPlatformBinaries("Mac64");
      await copyClientConnectPlatformBinaries("Linux32");
      await copyClientConnectPlatformBinaries("Linux64");
    }
  }
  
  static stripDefinition(s: string): string {
    if (s.startsWith('#/definitions/')) {
      return s.substr('#/definitions/'.length).replace(/(\[|\])/g, '');
    }
    return s.replace(/(\[|\])/g, '');
  }

  static getCSharpTypeFromDefinition(namespace: string, definition: schema.Definition, useConst: boolean, useConstIn?: boolean, isResponse?: boolean): string {
    const constName = useConst ? 'const ' : '';
    const arrayConstName = useConstIn ? 'const ': '';
    const arrayConstSuffix = useConstIn ? '&' : '';
    const nullableSuffix = (definition.required || isResponse) ? '' : '?';
    let type = null;
    try {
      if (definition.type != null) {
        switch (definition.type as string|null) {
          case 'string':
            switch (definition.format) {
              case 'byte':
                type = 'byte[]';
                break;
              default:
                type = 'string';
                break;
            }
            break;
          case 'integer':
            switch (definition.format) {
              case 'int32':
                type = 'int' + nullableSuffix;
                break;
              case 'int64':
                type = 'long' + nullableSuffix;
                break;
            }
            break;
          case 'number':
            switch (definition.format) {
              case 'float':
                type = 'float' + nullableSuffix;
                break;
              case 'double':
                type = 'double' + nullableSuffix;
                break;
            }
            break;
          case 'boolean':
            type = 'bool' + nullableSuffix;
            break;
          case 'object':
            if ((definition as any).additionalProperties != null) {
              // This is a dictionary.
              type = 'System.Collections.Generic.Dictionary<object, ' + CSharpGenerator.getCSharpTypeFromDefinition(namespace, (definition as any).additionalProperties, false, useConstIn) + '>';
            } else {
              type = 'Newtonsoft.Json.Linq.JObject';
            }
            break;
          case 'array':
            type = 
              CSharpGenerator.getCSharpTypeFromDefinition(namespace, definition.items, false, useConstIn, isResponse) +
              '[]';
            break;
        }
      } else if (definition.schema != null) {
        if (definition.schema.type == 'array') {
          type = 
            CSharpGenerator.getCSharpTypeFromDefinition(namespace, definition.schema.items, false, useConstIn, isResponse) +
            '[]';
        } else if (definition.schema.$ref != null) {
          type = namespace + '.' + CSharpGenerator.stripDefinition(definition.schema.$ref);
        } else {
          return CSharpGenerator.getCSharpTypeFromDefinition(namespace, definition.schema, useConst, useConstIn, isResponse);
        }
      } else if (definition.$ref != null) {
        type = namespace + '.' + CSharpGenerator.stripDefinition(definition.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      type = 'int' + nullableSuffix + ' /* unknown */';
    }
    return type;
  }

  static getParametersFromMethodParameter(namespace: string, parameters: any): string {
    let parametersArr = [];
    if (parameters != null) {
      for (let parameter of parameters) {
        let name = parameter.name;
        if (name == "cancellationToken") {
          name = "_cancellationToken";
        }
        parametersArr.push(
          CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false) +
          " @" + 
          name
        );
      }
    }
    return parametersArr.join(", ");
  }

  static getArgumentsFromMethodParameter(namespace: string, parameters: any): string {
    let argumentsArr = [];
    if (parameters != null) {
      for (let parameter of parameters) {
        let name = parameter.name;
        if (name == "cancellationToken") {
          name = "_cancellationToken";
        }
        argumentsArr.push(
          name
        );
      }
    }
    return argumentsArr.join(", ");
  }

  static applyCommentLines(s: string, i: string): string {
    if (s == null) {
      return "";
    }
    return xmlescape(s).replace(/(?:\r\n|\r|\n)/g, "\n" + i);
  }

  async generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void> {
    let clientConnectDefines = '';
    if (opts.enableClientConnect) {
      clientConnectDefines = `
#define ENABLE_CLIENT_CONNECT_SDK`;
    }
    const commonDefines = `
#if UNITY_5 || UNITY_5_3_OR_NEWER
#define IS_UNITY
#endif
#if !(NET35 || (IS_UNITY && !NET_4_6))
#define HAS_TASKS
#endif
#if !NET35 && !IS_UNITY
#define HAS_HTTPCLIENT
#endif
#if IS_UNITY && NET_4_6 && UNITY_2017_1
#error Unity 2017.1 with a .NET 4.6 runtime is not supported due to known bugs in Unity (bit.ly/2xeicxY). Either upgrade to 2017.2 or use the .NET 2.0 runtime.
#endif
`;
    let code = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}
${clientConnectDefines}
${commonDefines}

`;

    for (let apiId in documents) {
      let api = documents[apiId];
      let csharpName = api.info["x-sdk-csharp-package-name"];
      let namespace = csharpName + '.Api';

      code += `
namespace ${namespace}
{
    #pragma warning disable // Disable all warnings
`;

      let tags = {};
      for (let pathName in api.paths) {
        for (let methodName in api.paths[pathName]) {
          let tag = api.paths[pathName][methodName].tags[0];
          if (tags[tag] == undefined) {
            tags[tag] = [];
          }
          tags[tag].push({
            pathName: pathName,
            methodName: methodName
          });
        }
      }

      let orderedDefinitionNames = Object.keys(api.definitions);
      orderedDefinitionNames.sort();

      for (let definitionName of orderedDefinitionNames) {
        if (definitionName == 'HiveSystemError') {
          continue;
        }
        const className = definitionName.replace(/(\[|\])/g, '');
        code += `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public class ${className}
    {
        static ${className}()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }

`;
        for (let propertyName in api.definitions[definitionName].properties) {
          let propertyValue = api.definitions[definitionName].properties[propertyName];
          let propertyType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, propertyValue, false);
          let name = propertyName[0].toUpperCase() + propertyName.substr(1);
          if (name == definitionName) {
            // C# does not allow member names to be the same as their types.
            name += "_";
          }
          code += `
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(propertyValue.description, "        /// ")}
        /// </summary>
        [Newtonsoft.Json.JsonProperty("${propertyName}")]
        public ${propertyType} ${name} { get; set; }
`;
        }
        code += `
    }
`;
      }

      for (let tag in tags) {
        code += `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public interface I${tag}Client
    {
        /// <summary>
        /// The API key sent in requests to Hive.  When calling methods that require no API key, this should
        /// be null, otherwise set it to the API key.
        /// </summary>
        string ApiKey { get; set; }
        
        /// <summary>
        /// The base URL for the API. This is set to production for you by default, but if want to use development or
        /// enterprise endpoints, you'll need to set this.
        /// </summary>
        string BaseUrl { get; set; }
    
        /// <summary>
        /// Called when preparing an API request; you can use this event to modify where the
        /// request is sent.
        /// </summary>
        System.Func<HiveMP.Api.RetryableHttpClient, string, string> InterceptRequest { get; set; }
`;

        for (let el of tags[tag]) {
          let methodValue = api.paths[el.pathName][el.methodName];
          if (GeneratorUtility.isClusterOnlyMethod(methodValue) && !opts.includeClusterOnly) {
            continue;
          }
          let methodName = 
            methodValue.operationId[0].toUpperCase() +
            methodValue.operationId.substr(1);
          let returnValue = 'void';
          let asyncReturnValue = 'System.Threading.Tasks.Task';
          if (methodValue.responses != null && methodValue.responses["200"] != null) {
            returnValue = CSharpGenerator.getCSharpTypeFromDefinition(namespace, methodValue.responses["200"], false, false, true);
            if (returnValue == null) {
              returnValue = 'void';
            } else {
              asyncReturnValue = 'System.Threading.Tasks.Task<' + returnValue + '>';
            }
          }
          let promiseResolve = 'System.Action<' + returnValue + '>';
          if (returnValue == 'void') {
            promiseResolve = 'System.Action';
          }
          code += `
#if HAS_TASKS
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        ${asyncReturnValue} ${methodName}Async(${methodName}Request arguments);

        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
        ${asyncReturnValue} ${methodName}Async(${methodName}Request arguments, System.Threading.CancellationToken cancellationToken);
#endif
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        ${returnValue} ${methodName}(${methodName}Request arguments);
#if IS_UNITY && !NET_4_6 && !HAS_TASKS
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        /// <param name="resolve">The callback to run when the API call returns. This is always executed on the main thread.</param>
        /// <param name="reject">The callback to run when the API call failed. This is always executed on the main thread.</param>
        void ${methodName}Promise(${methodName}Request arguments, ${promiseResolve} resolve, System.Action<HiveMP.Api.HiveMPException> reject);
#endif
`;
        }

        let startupCode = '';
        let clientConnectWaitAsync = '';
        let clientConnectWait = '';
        if (!(tag == 'Files' && apiId == 'client-connect')) {
          startupCode = `
        static ${tag}Client()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }`;
          clientConnectWait = `
#if ENABLE_CLIENT_CONNECT_SDK
            HiveMP.Api.HiveMPSDKSetup.WaitForClientConnect();
#endif
`;
          clientConnectWaitAsync = `
#if ENABLE_CLIENT_CONNECT_SDK
            await HiveMP.Api.HiveMPSDKSetup.WaitForClientConnectAsync();
#endif
`;
        }

        code += `
    }

    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public class ${tag}Client : I${tag}Client
    {
        ${startupCode}

        /// <summary>
        /// The API key sent in requests to Hive.  When calling methods that require no API key, this should
        /// be null, otherwise set it to the API key.
        /// </summary>
        public string ApiKey { get; set; }
    
        /// <summary>
        /// The base URL for the API. This is set to production for you by default, but if want to use development or
        /// enterprise endpoints, you'll need to set this.
        /// </summary>
        public string BaseUrl { get; set; }
    
        /// <summary>
        /// Called when preparing an API request; you can use this event to modify where the
        /// request is sent.
        /// </summary>
        public System.Func<HiveMP.Api.RetryableHttpClient, string, string> InterceptRequest { get; set; }
        
        private void PrepareRequest(HiveMP.Api.RetryableHttpClient request, string url)
        {
            request.DefaultRequestHeaders.Add("X-API-Key", ApiKey ?? string.Empty);
        }

        private void PrepareRequest(HiveMP.Api.RetryableHttpClient request, System.Text.StringBuilder urlBuilder)
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
        /// Constructs a new ${tag}Client for calling the ${api.host} API.
        /// </summary>
        /// <param name="apiKey">The HiveMP API key to use.</param>
        public ${tag}Client(string apiKey)
        {
            ApiKey = apiKey;
            BaseUrl = "https://${api.host}${api.basePath}";
        }

        /// <summary>
        /// Constructs a new ${tag}Client for calling the ${api.host} API, with a default empty API key.
        /// </summary>
        public ${tag}Client()
        {
            ApiKey = string.Empty;
            BaseUrl = "https://${api.host}${api.basePath}";
        }
`;

        for (let el of tags[tag]) {
          let methodValue = api.paths[el.pathName][el.methodName];
          if (GeneratorUtility.isClusterOnlyMethod(methodValue) && !opts.includeClusterOnly) {
            continue;
          }
          let methodName = 
            methodValue.operationId[0].toUpperCase() +
            methodValue.operationId.substr(1);
          let returnValue = 'void';
          let asyncReturnValue = 'System.Threading.Tasks.Task';
          if (methodValue.responses != null && methodValue.responses["200"] != null) {
            returnValue = CSharpGenerator.getCSharpTypeFromDefinition(namespace, methodValue.responses["200"], false, false, true);
            if (returnValue == null) {
              returnValue = 'void';
            } else {
              asyncReturnValue = 'System.Threading.Tasks.Task<' + returnValue + '>';
            }
          }
          let promiseResolve = 'System.Action<' + returnValue + '>';
          if (returnValue == 'void') {
            promiseResolve = 'System.Action';
          }
          let parameters = CSharpGenerator.getParametersFromMethodParameter(namespace, methodValue.parameters);
          let argumentsSuffix = parameters != '' ? ', ' : '';
          let returnSyncPrefix = returnValue == 'void' ? '' : 'return ';
          let createRequest = `new ${methodName}Request
            {`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let csharpType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false);
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              createRequest += `
                  ${name} = @${parameter.name},`;
            }
          }
          createRequest += `
            }`;
          code += `
#if HAS_TASKS
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              code += `
        /// <param name="${xmlescape(name)}">${CSharpGenerator.applyCommentLines(parameter.description, "        /// ")}</param>`;
            }
          }
          code += `
        [System.Obsolete(
            "API calls with fixed position parameters are subject to change when new optional parameters " +
            "are added to the API; use the ${methodName}Async(${methodName}Request) version of this method " +
            "instead to ensure forward compatibility")]
        public ${asyncReturnValue} ${methodName}Async(${parameters})
        {
            return ${methodName}Async(${createRequest}, System.Threading.CancellationToken.None);
        }

        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              code += `
        /// <param name="${xmlescape(parameter.name)}">${CSharpGenerator.applyCommentLines(parameter.description, "        /// ")}</param>`;
            }
          }
          code += `
        /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
        [System.Obsolete(
            "API calls with fixed position parameters are subject to change when new optional parameters " +
            "are added to the API; use the ${methodName}Async(${methodName}Request,CancellationToken) version of this method " +
            "instead to ensure forward compatibility")]
        public ${asyncReturnValue} ${methodName}Async(${parameters}${argumentsSuffix}System.Threading.CancellationToken cancellationToken)
        {
            return ${methodName}Async(${createRequest}, cancellationToken);
        }
        
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        public ${asyncReturnValue} ${methodName}Async(${methodName}Request arguments)
        {
            return ${methodName}Async(arguments, System.Threading.CancellationToken.None);
        }

        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
        public async ${asyncReturnValue} ${methodName}Async(${methodName}Request arguments, System.Threading.CancellationToken cancellationToken)
        {
            ${clientConnectWaitAsync}

#if ENABLE_CLIENT_CONNECT_SDK
            // TODO: Make threaded when Client Connect supports it!
            if (HiveMP.Api.HiveMPSDKSetup.IsHotpatched("${apiId}", "${methodValue.operationId}"))
            {
                var delay = 1000;
                do
                {
                    int statusCode;
                    var response = HiveMP.Api.HiveMPSDKSetup.CallHotpatch(
                        "${apiId}",
                        "${methodValue.operationId}",
                        BaseUrl,
                        ApiKey,
                        Newtonsoft.Json.JsonConvert.SerializeObject(arguments),
                        out statusCode);
                    if (statusCode >= 200 && statusCode < 300)
                    {
`;
          if (returnValue != 'void') {
            code += `
                        var result_ = default(${returnValue}); 
                        try
                        {
                            result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnValue}>(response);
                            return result_; 
                        } 
                        catch (System.Exception exception) 
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }
`;
          } else {
            code += `
                        return;
`;
          }
          code += `
                    }
                    else
                    {
                        var result_ = default(HiveMP.Api.HiveMPSystemError); 
                        try
                        {
                            result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(response);
                            if (result_.Code >= 6000 && result_.Code < 7000)
                            {
                                await System.Threading.Tasks.Task.Delay(delay);
                                delay *= 2;
                                delay = System.Math.Min(30000, delay);
                                continue;
                            }
                        } 
                        catch (System.Exception exception_) 
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }

                        if (result_ == null)
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }

                        throw new HiveMP.Api.HiveMPException(statusCode, result_);
                    }
                }
                while (true);
            }
#endif

            var urlBuilder_ = new System.Text.StringBuilder();
            urlBuilder_.Append(BaseUrl).Append("${el.pathName}?");`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let csharpType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false);
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              if (parameter.in == "body") {
                continue;
              }
              let converter = '.ToString()';
              if (parameter.type === 'string' && parameter.format === 'byte') {
                converter = '';
              }
              let valueAccess = `arguments.${name}${converter}`;
              if (parameter.type === 'string' && parameter.format === 'byte') {
                valueAccess = `System.Uri.EscapeDataString(System.Convert.ToBase64String(${valueAccess}))`;
              } else {
                valueAccess = `System.Uri.EscapeDataString(${valueAccess})`;
              }
              if (parameter.required) {
                if (!csharpType.startsWith("int") && csharpType != "long" && csharpType != "float" && csharpType != "double") {
                  code += `
            if (arguments.${name} == null) throw new System.ArgumentNullException("arguments.${name}");`;
                }
                code += `
            urlBuilder_.Append("${parameter.name}=").Append(${valueAccess}).Append("&");`;
              } else {
                code += `
            if (arguments.${name} != null) urlBuilder_.Append("${parameter.name}=").Append(${valueAccess}).Append("&");`;
              }
            }
          }
          code += `
            urlBuilder_.Length--;
    
            var client_ = new HiveMP.Api.RetryableHttpClient();
            try
            {
#if HAS_HTTPCLIENT
                using (var request_ = new System.Net.Http.HttpRequestMessage())
                {
                    PrepareRequest(client_, urlBuilder_);
                    var url_ = urlBuilder_.ToString();
                    PrepareRequest(client_, url_);
                    
                    System.Net.Http.StringContent content_ = null;`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let csharpType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false);
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              if (parameter.in == "body") {
                code += `
                    content_ = new System.Net.Http.StringContent(Newtonsoft.Json.JsonConvert.SerializeObject(arguments.${name}), System.Text.Encoding.UTF8, "application/json");
`;
                break;
              }
            }
          }
          code += `
                    if (content_ == null)
                    {
                        content_ = new System.Net.Http.StringContent(string.Empty);
                    }
                    
                    if ("${el.methodName.toUpperCase()}" != "GET" && "${el.methodName.toUpperCase()}" != "DELETE")
                    {
                        request_.Content = content_;
                    }
                    request_.Method = new System.Net.Http.HttpMethod("${el.methodName.toUpperCase()}");
                    request_.RequestUri = new System.Uri(url_, System.UriKind.RelativeOrAbsolute);
                    request_.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                    var response_ = await client_.SendAsync(request_, System.Net.Http.HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
                    try
                    {
                        var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers, h_ => h_.Key, h_ => h_.Value);
                        foreach (var item_ in response_.Content.Headers)
                            headers_[item_.Key] = item_.Value;
    
                        var status_ = ((int)response_.StatusCode).ToString();
                        if (status_ == "200") 
                        {
                            var responseData_ = await response_.Content.ReadAsStringAsync().ConfigureAwait(false); 
`;
          if (returnValue != 'void') {
            code += `
                            var result_ = default(${returnValue}); 
                            try
                            {
                                result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnValue}>(responseData_);
                                return result_; 
                            } 
                            catch (System.Exception exception) 
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }
`;
          }
          code += `
                        }
                        else
                        {
                            var responseData_ = await response_.Content.ReadAsStringAsync().ConfigureAwait(false); 
                            var result_ = default(HiveMP.Api.HiveMPSystemError); 
                            try
                            {
                                result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                            } 
                            catch (System.Exception exception_) 
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }

                            if (result_ == null)
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }
    
                            throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
                        }
                    }
                    finally
                    {
                        if (response_ != null)
                            response_.Dispose();
                    }
                }
#else
                // Run non-HttpClient on a background task explicitly,
                // as old style web requests don't support async methods.
                try
                {
                    ${returnSyncPrefix}await System.Threading.Tasks.Task.Run(async () =>
                    {
                        PrepareRequest(client_, urlBuilder_);
                        var url_ = urlBuilder_.ToString();
                        PrepareRequest(client_, url_);

                        // TODO: Support methods with body parameters.
                        var content = string.Empty;
                        
                        var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
                        request_.Method = "${el.methodName.toUpperCase()}";
                        request_.ContentLength = content.Length;
                        request_.Accept = "application/json";
                        client_.UpdateRequest(request_);

                        if (request_.Method != "GET" && request_.Method != "DELETE")
                        {
                            request_.ContentType = "application/json";

                            // This will actually start the request, so we can't send any more headers
                            // after opening the request stream.
                            using (var writer = new System.IO.StreamWriter(request_.GetRequestStream()))
                            {
                                writer.Write(content);
                            }
                        }

                        var response_ = client_.ExecuteRequest(request_);
                        var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

                        var status_ = ((int)response_.StatusCode).ToString();
                        if (status_ == "200") 
                        {
                            string responseData_;
                            using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                            {
                                responseData_ = reader.ReadToEnd();
                            }
`;
          if (returnValue != 'void') {
            code += `
                            var result_ = default(${returnValue}); 
                            try
                            {
                                result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnValue}>(responseData_);
                                return result_; 
                            } 
                            catch (System.Exception exception) 
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }
`;
          }
          code += `
                        }
                        else
                        {
                            string responseData_;
                            using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                            {
                                responseData_ = reader.ReadToEnd();
                            }
                            var result_ = default(HiveMP.Api.HiveMPSystemError); 
                            try
                            {
                                result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                            } 
                            catch (System.Exception exception_) 
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }

                            if (result_ == null)
                            {
                                throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                    {
                                        Code = 0,
                                        Message = "Could not deserialize the response body.",
                                        Fields = string.Empty,
                                    });
                            }

                            throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
                        }
                    });
                }
                catch (System.AggregateException ex)
                {
                    if (ex.InnerExceptions.Count == 1)
                    {
                        if (ex.InnerExceptions[0] is HiveMP.Api.HiveMPException)
                        {
                            // Rethrow the HiveMPException without it being wrapped in AggregateException.
                            throw ex.InnerExceptions[0];
                        }
                    }

                    // Otherwise propagate.
                    throw;
                }
#endif
            }
            finally
            {
                if (client_ != null)
                    client_.Dispose();
            }
        }
#endif

        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              code += `
        /// <param name="${xmlescape(parameter.name)}">${CSharpGenerator.applyCommentLines(parameter.description, "        /// ")}</param>`;
            }
          }
          code += `
        [System.Obsolete(
            "API calls with fixed position parameters are subject to change when new optional parameters " +
            "are added to the API; use the ${methodName}(${methodName}Request) version of this method " +
            "instead to ensure forward compatibility")]
        public ${returnValue} ${methodName}(${parameters})
        {
#if HAS_TASKS
            ${returnSyncPrefix}System.Threading.Tasks.Task.Run(async () => await ${methodName}Async(${createRequest}, System.Threading.CancellationToken.None)).GetAwaiter().GetResult();
#else
            ${returnSyncPrefix}${methodName}(${createRequest});
#endif
        }

#if IS_UNITY && !NET_4_6 && !HAS_TASKS
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        /// <param name="resolve">The callback to run when the API call returns. This is always executed on the main thread.</param>
        /// <param name="reject">The callback to run when the API call failed. This is always executed on the main thread.</param>
        public void ${methodName}Promise(${methodName}Request arguments, ${promiseResolve} resolve, System.Action<HiveMP.Api.HiveMPException> reject)
        {
`;
          if (returnValue != 'void') {
            code += `
            new HiveMP.Api.HiveMPUnityPromise<${returnValue}>(() =>
            {
                return ${methodName}(arguments);
            }, resolve, reject);
`;
          } else {
            code += `
            new HiveMP.Api.HiveMPUnityPromise<bool>(() =>
            {
                ${methodName}(arguments);
                return true;
            }, _ => resolve(), reject);
`;
          }
          code += `
        }
#endif

        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(methodValue.summary, "        /// ")}
        /// </summary>
        /// <remarks>
        /// ${CSharpGenerator.applyCommentLines(methodValue.description, "        /// ")}
        /// </remarks>
        /// <param name="arguments">The ${xmlescape(methodName)} arguments.</param>
        public ${returnValue} ${methodName}(${methodName}Request arguments)
        {
#if HAS_TASKS
            ${returnSyncPrefix}System.Threading.Tasks.Task.Run(async () => await ${methodName}Async(arguments, System.Threading.CancellationToken.None)).GetAwaiter().GetResult();
#else
            ${clientConnectWait}

#if ENABLE_CLIENT_CONNECT_SDK
            if (HiveMP.Api.HiveMPSDKSetup.IsHotpatched("${apiId}", "${methodValue.operationId}"))
            {
                var delay = 1000;
                do
                {
                    int statusCode;
                    var response = HiveMP.Api.HiveMPSDKSetup.CallHotpatch(
                        "${apiId}",
                        "${methodValue.operationId}",
                        BaseUrl,
                        ApiKey,
                        Newtonsoft.Json.JsonConvert.SerializeObject(arguments),
                        out statusCode);
                    if (statusCode >= 200 && statusCode < 300)
                    {
`;
          if (returnValue != 'void') {
            code += `
                        var result_ = default(${returnValue}); 
                        try
                        {
                            result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnValue}>(response);
                            return result_; 
                        } 
                        catch (System.Exception exception) 
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }
`;
          } else {
            code += `
                        return;
`;
          }
          code += `
                    }
                    else
                    {
                        var result_ = default(HiveMP.Api.HiveMPSystemError); 
                        try
                        {
                            result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(response);
                            if (result_.Code >= 6000 && result_.Code < 7000)
                            {
                                System.Threading.Thread.Sleep(delay);
                                delay *= 2;
                                delay = System.Math.Min(30000, delay);
                                continue;
                            }
                        } 
                        catch (System.Exception exception_) 
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }

                        if (result_ == null)
                        {
                            throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                                {
                                    Code = 0,
                                    Message = "Could not deserialize the response body.",
                                    Fields = string.Empty,
                                });
                        }

                        throw new HiveMP.Api.HiveMPException(statusCode, result_);
                    }
                }
                while (true);
            }
#endif

            var urlBuilder_ = new System.Text.StringBuilder();
            urlBuilder_.Append(BaseUrl).Append("${el.pathName}?");`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let csharpType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false);
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              if (parameter.required) {
                if (!csharpType.startsWith("int") && csharpType != "long" && csharpType != "float" && csharpType != "double") {
                  code += `
            if (arguments.${name} == null) throw new System.ArgumentNullException("arguments.${name}");`;
                }
                code += `
            urlBuilder_.Append("${parameter.name}=").Append(System.Uri.EscapeDataString(arguments.${name} == null ? "" : arguments.${name}.ToString())).Append("&");`;
              } else {
                code += `
            if (arguments.${name} != null) urlBuilder_.Append("${parameter.name}=").Append(System.Uri.EscapeDataString(arguments.${name}.ToString())).Append("&");`;
              }
            }
          }
          code += `
            urlBuilder_.Length--;
    
            var client_ = new HiveMP.Api.RetryableHttpClient();
            try
            {
                PrepareRequest(client_, urlBuilder_);
                var url_ = urlBuilder_.ToString();
                PrepareRequest(client_, url_);

                // TODO: Support methods with body parameters.
                var content = string.Empty;
                
                var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
                request_.Method = "${el.methodName.toUpperCase()}";
                request_.ContentLength = content.Length;
                request_.Accept = "application/json";
                client_.UpdateRequest(request_);

                if (request_.Method != "GET" && request_.Method != "DELETE")
                {
                    request_.ContentType = "application/json";

                    // This will actually start the request, so we can't send any more headers
                    // after opening the request stream.
                    using (var writer = new System.IO.StreamWriter(request_.GetRequestStream()))
                    {
                        writer.Write(content);
                    }
                }

                var response_ = client_.ExecuteRequest(request_);
                var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

                var status_ = ((int)response_.StatusCode).ToString();
                if (status_ == "200") 
                {
                    string responseData_;
                    using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                    {
                        responseData_ = reader.ReadToEnd();
                    }
`;
          if (returnValue != 'void') {
            code += `
                    var result_ = default(${returnValue}); 
                    try
                    {
                        result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnValue}>(responseData_);
                        return result_; 
                    } 
                    catch (System.Exception exception) 
                    {
                        throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                            {
                                Code = 0,
                                Message = "Could not deserialize the response body.",
                                Fields = string.Empty,
                            });
                    }
`;
          }
          code += `
                }
                else
                {
                    string responseData_;
                    using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                    {
                        responseData_ = reader.ReadToEnd();
                    }
                    var result_ = default(HiveMP.Api.HiveMPSystemError); 
                    try
                    {
                        result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                    } 
                    catch (System.Exception exception_) 
                    {
                        throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                            {
                                Code = 0,
                                Message = "Could not deserialize the response body.",
                                Fields = string.Empty,
                            });
                    }

                    if (result_ == null)
                    {
                        throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                            {
                                Code = 0,
                                Message = "Could not deserialize the response body.",
                                Fields = string.Empty,
                            });
                    }

                    throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
                }
            }
            finally
            {
                if (client_ != null)
                    client_.Dispose();
            }
#endif
        }
`;
        }

        code += `
    }
`;

        for (let el of tags[tag]) {
          let methodValue = api.paths[el.pathName][el.methodName];
          if (GeneratorUtility.isClusterOnlyMethod(methodValue) && !opts.includeClusterOnly) {
            continue;
          }
          let methodName = 
            methodValue.operationId[0].toUpperCase() +
            methodValue.operationId.substr(1);
          code += `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public struct ${methodName}Request
    {
`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let csharpType = CSharpGenerator.getCSharpTypeFromDefinition(namespace, parameter, false);
              let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
              code += `
        /// <summary>
        /// ${CSharpGenerator.applyCommentLines(parameter.description, "        /// ")}
        /// </summary>
        [Newtonsoft.Json.JsonProperty("${parameter.name}")]
        public ${csharpType} ${name} { get; set; }
  `;
            }
          }
          code += `
    }
`;
        }
      }

      code += `
}
`;
    }

    let httpClient = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}
${clientConnectDefines}
${commonDefines}

using Newtonsoft.Json;
using System;
using System.IO;
#if HAS_HTTPCLIENT
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
#else
using System.Net;
#endif
using System.Threading;
#if HAS_TASKS
using System.Threading.Tasks;
#endif

namespace HiveMP.Api
{
#if HAS_HTTPCLIENT
    public class RetryableHttpClient : IDisposable
    {
        private readonly HttpClient _httpClient;

        static RetryableHttpClient()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }

        public RetryableHttpClient()
        {
            _httpClient = new HttpClient();
        }

        public HttpRequestHeaders DefaultRequestHeaders
        {
            get => _httpClient.DefaultRequestHeaders;
        }

        public void Dispose()
        {
            _httpClient.Dispose();
        }

        public Task<HttpResponseMessage> GetAsync(string requestUri)
        {
            return SendAsync(new HttpRequestMessage(HttpMethod.Get, requestUri), HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        public Task<HttpResponseMessage> PostAsync(string requestUri, HttpContent content)
        {
            return SendAsync(new HttpRequestMessage(HttpMethod.Post, requestUri) { Content = content }, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        public Task<HttpResponseMessage> PutAsync(string requestUri, HttpContent content)
        {
            return SendAsync(new HttpRequestMessage(HttpMethod.Put, requestUri) { Content = content }, HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        public Task<HttpResponseMessage> DeleteAsync(string requestUri)
        {
            return SendAsync(new HttpRequestMessage(HttpMethod.Delete, requestUri), HttpCompletionOption.ResponseContentRead, CancellationToken.None);
        }

        public async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, HttpCompletionOption completionOption, CancellationToken cancellationToken)
        {
            using (var memory = new MemoryStream())
            {
                byte[] bytes = null;
                if (request.Content != null)
                {
                    await request.Content.CopyToAsync(memory);
                    memory.Seek(0, SeekOrigin.Begin);

                    bytes = new byte[memory.Length];
                    await memory.ReadAsync(bytes, 0, bytes.Length);
                }

                var delay = 1000;
                do
                {
                    // Make the request retryable
                    var newContent = bytes != null ? new ByteArrayContent(bytes) : null;
                    if (newContent != null)
                    {
                        if (request.Content.Headers != null)
                        {
                            foreach (var h in request.Content.Headers)
                            {
                                newContent.Headers.Add(h.Key, h.Value);
                            }
                        }
                    }

                    var newRequest = new HttpRequestMessage
                    {
                        Content = newContent,
                        Method = request.Method,
                        RequestUri = request.RequestUri,
                        Version = request.Version
                    };
                    foreach (var h in request.Headers)
                    {
                        newRequest.Headers.Add(h.Key, h.Value);
                    }
                    foreach (var p in request.Properties)
                    {
                        newRequest.Properties.Add(p);
                    }
                    
                    HttpResponseMessage response;
                    try
                    {
                        response = await _httpClient.SendAsync(newRequest, completionOption, cancellationToken);
                    }
                    catch (AggregateException ex) when (ex.InnerExceptions.Any(x => x?.Message == "Server returned nothing (no headers, no data)"))
                    {
                        // This indicates we had a cURL exception inside the request, and that the server didn't
                        // respond with anything (even though the TCP connection was successful). Treat this as a
                        // "retry operation" scenario.
                        await Task.Delay(delay);
                        delay *= 2;
                        delay = Math.Min(30000, delay);
                        continue;
                    }
                    catch (TaskCanceledException)
                    {
                        var t = Task.Delay(delay);
                        await t;
                        delay *= 2;
                        delay = Math.Min(30000, delay);
                        continue;
                    }

                    if (!response.IsSuccessStatusCode)
                    {
                        var responseData = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var result = default(HiveMPSystemError);
                        try
                        {
                            result = JsonConvert.DeserializeObject<HiveMPSystemError>(responseData);
                        }
                        catch (Exception)
                        {
                            // Allow the handle to fail parsing this.
                            return response;
                        }

                        if (result == null)
                        {
                            // Unable to parse response, let the handle
                            // fail parsing this.
                            return response;
                        }

                        if (result.Code == 6001)
                        {
                            var t = Task.Delay(delay);
                            await t;
                            delay *= 2;
                            delay = Math.Min(30000, delay);
                            continue;
                        }
                    }

                    return response;
                }
                while (true);
            }
        }
    }
#else
    public class RetryableHttpClient : System.IDisposable
    {
        static RetryableHttpClient()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }

        public RetryableHttpClient()
        {
            DefaultRequestHeaders = new System.Collections.Generic.Dictionary<string, string>();
        }

        public System.Collections.Generic.Dictionary<string, string> DefaultRequestHeaders { get; set; }
        
        public HttpWebRequest UpdateRequest(HttpWebRequest request)
        {
            foreach (var kv in DefaultRequestHeaders)
            {
                request.Headers.Add(kv.Key, kv.Value);
            }
            return request;
        }

        public HttpWebResponse ExecuteRequest(HttpWebRequest request)
        {
            // TODO: Handle #6001 errors with retry logic
            return (HttpWebResponse)request.GetResponse();
        }

        public void Dispose()
        {
        }
    }
#endif
}    
`;

    let hiveException = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}
${clientConnectDefines}
${commonDefines}

using System;
using System.IO;
using System.Threading;

namespace HiveMP.Api
{
    public class HiveMPException : Exception
    {
        static HiveMPException()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }

        public HiveMPException(int httpStatusCode, HiveMPSystemError error)
            : base(GenerateMessageFromError(error))
        {
            HttpStatusCode = httpStatusCode;
            Error = error;
        }

        private static string GenerateMessageFromError(HiveMPSystemError error)
        {
            var errorCode = 0;
            var errorMessage = "";
            var errorFields = "";
            if (error != null)
            {
                errorCode = error.Code;
                if (error.Message != null)
                {
                    errorMessage = error.Message;
                }
                if (error.Fields != null)
                {
                    errorFields = error.Fields;
                }
            }
            return "#" + errorCode + ": " + errorMessage + " (" + errorFields + ")";
        }

        public int HttpStatusCode { get; set; }

        public HiveMPSystemError Error { get; set; }
    }
}    
`;

    let hiveSystemError = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}
${clientConnectDefines}
${commonDefines}

using Newtonsoft.Json;
using System;
using System.IO;
using System.Threading;

namespace HiveMP.Api
{
    public class HiveMPSystemError
    {
        static HiveMPSystemError()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }

        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("fields")]
        public string Fields { get; set; }
    }
}    
`;

    let hiveSdkSetup = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}
${clientConnectDefines}
${commonDefines}

using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace HiveMP.Api
{
    public static class HiveMPSDKSetup
    {
        private static IClientConnect _clientConnect;
        private static byte[] _clientConnectCustomInit = null;
        private static string _clientConnectEndpoint = "https://client-connect-api.hivemp.com/v1";
        private static bool _didInit;
        private static object _initLock = new object();
        private static System.Threading.ManualResetEvent _clientConnectEvent = new System.Threading.ManualResetEvent(false);

#if ENABLE_CLIENT_CONNECT_SDK
#if HAS_TASKS
        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
#endif
        private static void SetupClientConnect()
        {
#if IS_UNITY
            // Unity handles the mapping of native DLLs in it's .meta files.
            _clientConnect = new ClientConnectUnityPlatform();
#elif NET35
            if (System.IO.Path.DirectorySeparatorChar == '\\\\')
            {
                // Windows
                if (System.IntPtr.Size == 8)
                {
                    // 64-bit
                    _clientConnect = new ClientConnectWin64Platform();
                }
                else
                {
                    // 32-bit
                    _clientConnect = new ClientConnectWin32Platform(); 
                }
            }
            else
            {
                if (System.IO.Directory.Exists("/Library"))
                {
                    // macOS
                    if (System.IntPtr.Size == 8)
                    {
                        // 64-bit
                        _clientConnect = new ClientConnectMac64Platform();
                    }
                    else
                    {
                        // 32-bit macOS is not supported.  32-bit support for
                        // macOS is being removed by Apple in the near future.
                    }
                }
                else
                {
                    // Linux
                    if (System.IntPtr.Size == 8)
                    {
                        // 64-bit
                        _clientConnect = new ClientConnectLinux64Platform();
                    }
                    else
                    {
                        // 32-bit
                        _clientConnect = new ClientConnectLinux32Platform();
                    }
                }
            }
#else
            if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
            {
                // Windows
                if (System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture == System.Runtime.InteropServices.Architecture.X64)
                {
                    // 64-bit
                    _clientConnect = new ClientConnectWin64Platform();
                }
                else if (System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture == System.Runtime.InteropServices.Architecture.X86)
                {
                    // 32-bit
                    _clientConnect = new ClientConnectWin32Platform(); 
                }
                else
                {
                    // Other unsupported (like ARM/ARM64)
                    _clientConnect = null;
                }
            }
            else if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.OSX))
            {
                if (System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture == System.Runtime.InteropServices.Architecture.X64)
                {
                    // 64-bit
                    _clientConnect = new ClientConnectMac64Platform();
                }
                else
                {
                    // Other unsupported (like ARM/ARM64)
                    // 32-bit macOS is not supported.  32-bit support for
                    // macOS is being removed by Apple in the near future.
                    _clientConnect = null;
                }
            }
            else if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Linux))
            {
                // Linux
                if (System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture == System.Runtime.InteropServices.Architecture.X64)
                {
                    // 64-bit
                    _clientConnect = new ClientConnectLinux64Platform();
                }
                else if (System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture == System.Runtime.InteropServices.Architecture.X86)
                {
                    // 32-bit
                    _clientConnect = new ClientConnectLinux32Platform();
                }
                else
                {
                    // Other unsupported (like ARM/ARM64)
                    _clientConnect = null;
                }
            }
            else
            {
                // Unsupported platform
                _clientConnect = null;
            }
#endif

            if (_clientConnect != null)
            {
                try
                {
                    _clientConnect.MapChunk("_startupTest.lua", System.Text.Encoding.ASCII.GetBytes(@"
function _startupTest_hotpatch(id, endpoint, api_key, parameters_json)
    return 403, ""Nope""
end
register_hotpatch(""no-api:testPUT"", ""_startupTest_hotpatch"")"));
                    _clientConnect.SetStartup("_startupTest.lua");
                    int statusCode;
                    var response = _clientConnect.CallHotpatch("no-api", "testPUT", "https://no-api.hivemp.nonexistent.com/v1", "", "{}", out statusCode);
                    if (response != "Nope")
                    {
                        // Something went wrong and we can't use Client Connect.
                        _clientConnect = null;
                    }
                }
                catch (System.Exception)
                {
                    // We can't use Client Connect
                    _clientConnect = null;
                }

                if (_clientConnect != null)
                {
                    // TODO: Wait on startup whenever we have to make an API call.
                    var t = new System.Threading.Thread(new System.Threading.ThreadStart(FinalizeClientConnectSetup));
                    t.IsBackground = true;
                    t.Start();
                }
            }

            if (_clientConnect == null)
            {
                _clientConnectEvent.Set();
            }
        }

        private static void FinalizeClientConnectSetup()
        {
            try
            {
                var filesClient = new HiveMP.ClientConnect.Api.FilesClient(string.Empty);
                var doInit = false;
                var cacheFolder = System.IO.Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.ApplicationData), "HiveMP");
                cacheFolder = System.IO.Path.Combine(cacheFolder, "ClientConnectAssets");
                try
                {
                    System.IO.Directory.CreateDirectory(cacheFolder);
                }
                catch
                {
                    // Cache may not be available, continue anyway.
                }
                var f = new HiveMP.ClientConnect.Api.FilesClient(string.Empty);
                f.BaseUrl = _clientConnectEndpoint;
                var files = f.FilesGET(new HiveMP.ClientConnect.Api.FilesGETRequest());
                foreach (var file in files)
                {
                    var filename = file.Key as string;
                    if (filename == null)
                    {
                        continue;
                    }

                    if (filename == "init.lua")
                    {
                        doInit = true;
                    }
                    
                    var fileCache = System.IO.Path.Combine(cacheFolder, file.Value.Sha1.ToLower());
                    if (System.IO.File.Exists(fileCache))
                    {
                        try
                        {
                            using (var stream = new System.IO.FileStream(fileCache, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.Read))
                            {
                                var data = new byte[stream.Length];
                                stream.Read(data, 0, data.Length);
                                _clientConnect.MapChunk(filename, data);
                                continue;
                            }
                        }
                        catch
                        {
                            // Fallback to download.
                        }
                    }

                    using (var client = new System.Net.WebClient())
                    {
                        client.Headers.Add("X-API-Key", string.Empty);
                        var data = client.DownloadData(file.Value.Url);
                        _clientConnect.MapChunk(filename, data);

                        try
                        {
                            if (!System.IO.File.Exists(fileCache))
                            {
                                using (var stream = new System.IO.FileStream(fileCache, System.IO.FileMode.Create, System.IO.FileAccess.Write, System.IO.FileShare.None))
                                {
                                    stream.Write(data, 0, data.Length);
                                    continue;
                                }
                            }
                        }
                        catch
                        {
                            // Failed to optionally cache, ignore.
                        }
                    }
                }
                if (_clientConnectCustomInit != null)
                {
                    if (doInit)
                    {
                        // Free existing chunk.
                        _clientConnect.FreeChunk("init.lua");
                    }

                    _clientConnect.MapChunk("init.lua", _clientConnectCustomInit);
                    doInit = true;
                }
                if (doInit)
                {
                    _clientConnect.SetStartup("init.lua");
                }
            }
            catch (System.Exception ex)
            {
#if IS_UNITY
                UnityEngine.Debug.LogError(ex);
#else
                // Client Connect failed to initialise.
#endif
            }

            _clientConnectEvent.Set();
        }

#if HAS_TASKS
        internal static System.Threading.Tasks.Task WaitForClientConnectAsync()
        {
            return AsTask(_clientConnectEvent);
        }

        private static System.Threading.Tasks.Task AsTask(System.Threading.WaitHandle handle)
        {
            var tcs = new System.Threading.Tasks.TaskCompletionSource<object>();
            var registration = System.Threading.ThreadPool.RegisterWaitForSingleObject(handle, (state, timedOut) =>
            {
                var localTcs = (System.Threading.Tasks.TaskCompletionSource<object>)state;
                if (timedOut)
                    localTcs.TrySetCanceled();
                else
                    localTcs.TrySetResult(null);
            }, tcs, System.Threading.Timeout.InfiniteTimeSpan, executeOnlyOnce: true);
            tcs.Task.ContinueWith((_, state) => ((System.Threading.RegisteredWaitHandle)state).Unregister(null), registration, System.Threading.Tasks.TaskScheduler.Default);
            return tcs.Task;
        }
#endif

        internal static void WaitForClientConnect()
        {
            _clientConnectEvent.WaitOne();
        }
#endif

#if IS_UNITY
        private static bool HiveMPCertificateValidation(object sender, X509Certificate certificate, X509Chain chain, SslPolicyErrors sslPolicyErrors, X509Certificate2 nonSniRootCa)
        {
            // If there are no SSL errors, validation succeeds.
            if (sslPolicyErrors == SslPolicyErrors.None)
            {
                return true;
            }

            // If the sender is not a HTTPS Web Request, we can't validate whether the No SNI
            // certificate is for a HiveMP request.
            var httpWebRequest = sender as HttpWebRequest;
            if (httpWebRequest == null)
            {
                return false;
            }

            // If it's not a HiveMP request, we don't validate for it.
            if (!httpWebRequest.Address.Host.EndsWith(".hivemp.com"))
            {
                return false;
            }

            // First up, check if the chain has any statuses that are not related to CRL revocation.
            // We don't provide CRL lists for our No SNI certificate, because we're only using this
            // infrastructure to workaround Unity's poor SSL client support.
            if ((sslPolicyErrors & SslPolicyErrors.RemoteCertificateChainErrors) != 0)
            {
                var hasUnexpectedChainElementsValidationError = false;
                for (var i = 0; i < chain.ChainElements.Count; i++)
                {
                    var element = chain.ChainElements[i];
                    for (var s = 0; s < element.ChainElementStatus.Length; s++)
                    {
                        var chainStatus = element.ChainElementStatus[s];
                        if (chainStatus.Status != X509ChainStatusFlags.OfflineRevocation &&
                            chainStatus.Status != X509ChainStatusFlags.RevocationStatusUnknown)
                        {
                            hasUnexpectedChainElementsValidationError = true;
                        }
                    }
                }
                if (!hasUnexpectedChainElementsValidationError)
                {
                    sslPolicyErrors &= ~SslPolicyErrors.RemoteCertificateChainErrors;
                }
            }

            // If the remote name has a mismatch, check if the root CA for the provided
            // certificate is the Redpoint No SNI Root CA. We already know the request
            // is for *.hivemp.com due to previous checks.
            if ((sslPolicyErrors & SslPolicyErrors.RemoteCertificateNameMismatch) != 0)
            {
                var lastChainElement = chain.ChainElements[chain.ChainElements.Count - 1].Certificate;
                if (nonSniRootCa.Thumbprint == lastChainElement.Thumbprint)
                {
                    sslPolicyErrors &= ~SslPolicyErrors.RemoteCertificateNameMismatch;
                }
            }

            return sslPolicyErrors == SslPolicyErrors.None;
        }
#endif

        /// <summary>
        /// Sets custom init code to be used by the Client Connect SDK
        /// instead of the init.lua file provided by the API server.
        /// </summary>
        /// <remarks>
        /// There is no support for using this method.
        /// </remarks>
        public static void SetClientConnectCustomInit(byte[] init)
        {
            _clientConnectCustomInit = init;
        }

        /// <summary>
        /// Sets a custom endpoint for the Client Connect files retrieval
        /// that occurs during SDK startup.
        /// </summary>
        /// <remarks>
        /// There is no support for using this method.
        /// </remarks>
        public static void SetClientConnectEndpoint(string endpoint)
        {
            _clientConnectEndpoint = endpoint;
        }

        internal static bool IsHotpatched(string api, string operation)
        {
            if (_clientConnect == null)
            {
                return false; 
            }

            return _clientConnect.IsHotpatched(api, operation);
        }

        internal static string CallHotpatch(string api, string operation, string endpoint, string apiKey, string parametersAsJson, out int statusCode)
        {
            return _clientConnect.CallHotpatch(api, operation, endpoint, apiKey, parametersAsJson, out statusCode);
        }

        internal static void EnsureInited()
        {
            if (!_didInit)
            {
                lock (_initLock)
                {
#if IS_UNITY
                    var nonSniRootCa = new X509Certificate2(System.Convert.FromBase64String(@"
MIIGNjCCBB6gAwIBAgIJAIFAzu/SSMPWMA0GCSqGSIb3DQEBCwUAMIGnMQswCQYD
VQQGEwJBVTERMA8GA1UECAwIVmljdG9yaWExHzAdBgNVBAoMFlJlZHBvaW50IEdh
bWVzIFB0eSBMdGQxPDA6BgNVBAsMM1JlZHBvaW50IEdhbWVzIFB0eSBMdGQgTm8t
U05JIENlcnRpZmljYXRlIEF1dGhvcml0eTEmMCQGA1UEAwwdUmVkcG9pbnQgR2Ft
ZXMgTm8tU05JIFJvb3QgQ0EwHhcNMTgwMjE2MDQwNTE0WhcNMzgwMjExMDQwNTE0
WjCBpzELMAkGA1UEBhMCQVUxETAPBgNVBAgMCFZpY3RvcmlhMR8wHQYDVQQKDBZS
ZWRwb2ludCBHYW1lcyBQdHkgTHRkMTwwOgYDVQQLDDNSZWRwb2ludCBHYW1lcyBQ
dHkgTHRkIE5vLVNOSSBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkxJjAkBgNVBAMMHVJl
ZHBvaW50IEdhbWVzIE5vLVNOSSBSb290IENBMIICIjANBgkqhkiG9w0BAQEFAAOC
Ag8AMIICCgKCAgEA0rFk0tWyHoustnvIjaD4DK9eiSelMzei03vyJHwzGvr3Gb8q
xP0rotPFDPtP3OQD9mHkvfN44pxKJhulT7bGYqvHp1uB6/gDfjdK7etKI6pY3NeE
Vv+sflsc+bHJ0JAHuMJUA439qeekhHg+85W7IIOGhul0V2Onm9sg0hfmai7+xy28
bgxiw3aWuywl+3+fqFSJGWmtkkTHqN9FCiil6KSwcfa6GIiHk140PRsV4O4XtuFs
B0XUbhwG//6w7VfCPHDhtzmrDMTbPrQq8M6CUdp5cH8CrN48nSpw0mrt+ILF0qR9
t6CQXx2e9CebWFYEEiqDLJtFnO/gDiaQPhZTs1M0PQ4Q5L2VUQajLjxbEcWGo0FH
etoatE+p7So4lZGHD1pSlau91kgkkkP38TynyozGvLyND3eWmfNa0Qfb7YQma0Nl
O6ezYZs4RNPE+P1lZsY/9+3KpnlWRHVfEp8VjEGBdJnpwUcs+Ys9qpS5Fs0yvCqY
HEUuzgrfaOyl0F9A9WXD3rFZI1KWh7olbF5oV+c7o996r0VSMJ3XPKC72iWGONux
ddtFcGBRtIASZSkPuFNfOl2ARjqOAcy3//6XLX2nHW9YwDo+FEJhnR26tk5VpfmW
t/qMQ+BUmBPer+HYCtv2lSss/hxAxaiToo1IiVhQ4/XEQZgasa7I9neSR3kCAwEA
AaNjMGEwHQYDVR0OBBYEFPZeVoLdOgtxffUhY3fEcO6oKD8nMB8GA1UdIwQYMBaA
FPZeVoLdOgtxffUhY3fEcO6oKD8nMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/
BAQDAgGGMA0GCSqGSIb3DQEBCwUAA4ICAQBr+gv2FNFFDsM1TsdrP0Featjc41pI
iN/zRA5+UMSx8svIoQ68GDbcAC1jm96yxkjcn5TkUQknpwP7vo2GzO6+bPz4zbKZ
TYOn8oxuxAAvXm/+1YfSGNnuC5U+yPyg5cl8PhOuZgBlGXXhHi7e7bvyPzlHq9Ni
5BcsHiGYho8eTNbRRWVdmE+NA9ievyLP/sFiYbvJiEfprSMI5z2SwQF6PE2q9/DD
2BH9SLn+xf2NdVoGah76/ucbEou0XNzE66I8cQa/VNjm4Ks+iRBO4e2TVW+eMpQd
/JAvsv7eEgaOaadJL82dHIzG1lLh6KS+jIQF2lRfRtA7DSG4R6LBIMKltLdF7gyr
m8dChiCLeovbiLGch4qGohVTRfxCL4u8xmQKaftuuDJXZsEXEm8ihkvy6AoyAR7W
W0953oCT0ydWCF8C6FhBUSdkDBzctk/rdUdbpNmK4OzUsx9pnAfya1FRpjylh4KS
ZDottbiPxLyy7YOa7AWtAqEE6MmDAKLFw9tlecODSugWvu3ZZAZXARpS5z5IxSVU
wgXFr7o7U/FQ1xmjmlDPVkCMBnN2wVctJIJMHHm4RejLPf5aaLUXVgB48Ce0Jd+1
aLQ9T0/BMgxvrq09V8sSV+j7tnJDI3NXvujdGx6WQ/yDU/A62D9D3wgznN2aHJOg
Rx77b+JypsJMRA==".Replace("\\r\\n", "").Replace("\\n", "")));
                    var store = new X509Store(StoreName.Root, StoreLocation.CurrentUser);
                    try
                    {
                        store.Open(OpenFlags.ReadWrite);
                        store.Add(nonSniRootCa);
                    }
                    finally
                    {
                        store.Close();
                    }

                    // Validate requests using our No-SNI certificate, because Unity doesn't support any kind
                    // of modern SSL.
                    ServicePointManager.ServerCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) =>
                    {
                        return HiveMPCertificateValidation(sender, certificate, chain, sslPolicyErrors, nonSniRootCa);
                    };
#if (UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX) && NET_4_6 && UNITY_2017_2_OR_NEWER
                    System.Environment.SetEnvironmentVariable("MONO_TLS_PROVIDER", "legacy");
#endif
#endif
#if ENABLE_CLIENT_CONNECT_SDK
                    SetupClientConnect();
#endif
                    _didInit = true;
                }
            }
        }

        private interface IClientConnect
        {
            void MapChunk(string name, byte[] data);
            void FreeChunk(string name);
            void SetStartup(string name);
            void SetConfig(byte[] data);
            bool IsHotpatched(string api, string operation);
            string CallHotpatch(string api, string operation, string endpoint, string apiKey, string parametersAsJson, out int statusCode);
        }

        private class ClientConnectUnityPlatform : IClientConnect
        {
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_map_chunk([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name, byte[] data, int len);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_free_chunk([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_set_startup([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_set_config(byte[] data, int len);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern bool cc_is_hotpatched([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string api, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string operation);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern System.IntPtr cc_call_hotpatch([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string api, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string operation, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string endpoint, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string apiKey, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string parametersAsJson, out System.Int32 statusCode);
            [System.Runtime.InteropServices.DllImport("HiveMP.ClientConnect", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_free_string(System.IntPtr ptr);

            public void MapChunk(string name, byte[] data)
            {
                cc_map_chunk(name, data, data.Length);
            }

            public void FreeChunk(string name)
            {
                cc_free_chunk(name);
            }

            public void SetStartup(string name)
            {
                cc_set_startup(name);
            }

            public void SetConfig(byte[] data)
            {
                cc_set_config(data, data.Length);
            }

            public bool IsHotpatched(string api, string operation)
            {
                return cc_is_hotpatched(api, operation);
            }

            public string CallHotpatch(string api, string operation, string endpoint, string apiKey, string parametersAsJson, out int statusCode)
            {
                var strPtr = cc_call_hotpatch(api, operation, endpoint, apiKey, parametersAsJson, out statusCode);
                var ret = System.Runtime.InteropServices.Marshal.PtrToStringAnsi(strPtr);
                cc_free_string(strPtr);
                return ret;
            }
        }

`;
    let clientConnectPlatforms = [
      'Win32',
      'Win64',
      'Mac64',
      'Linux32',
      'Linux64'
    ];
    for (let platform of clientConnectPlatforms) {
      hiveSdkSetup += `
        private class ClientConnect${platform}Platform : IClientConnect
        {
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_map_chunk([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name, byte[] data, int len);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_free_chunk([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_set_startup([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string name);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_set_config(byte[] data, int len);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern bool cc_is_hotpatched([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string api, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string operation);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern System.IntPtr cc_call_hotpatch([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string api, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string operation, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string endpoint, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string apiKey, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPStr)] string parametersAsJson, out System.Int32 statusCode);
            [System.Runtime.InteropServices.DllImport("${platform}\\\\HiveMP.ClientConnect.dll", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl)]
            private static extern void cc_free_string(System.IntPtr ptr);

            public void MapChunk(string name, byte[] data)
            {
                cc_map_chunk(name, data, data.Length);
            }

            public void FreeChunk(string name)
            {
                cc_free_chunk(name);
            }

            public void SetStartup(string name)
            {
                cc_set_startup(name);
            }

            public void SetConfig(byte[] data)
            {
                cc_set_config(data, data.Length);
            }

            public bool IsHotpatched(string api, string operation)
            {
                return cc_is_hotpatched(api, operation);
            }

            public string CallHotpatch(string api, string operation, string endpoint, string apiKey, string parametersAsJson, out int statusCode)
            {
                var strPtr = cc_call_hotpatch(api, operation, endpoint, apiKey, parametersAsJson, out statusCode);
                var ret = System.Runtime.InteropServices.Marshal.PtrToStringAnsi(strPtr);
                cc_free_string(strPtr);
                return ret;
            }
        }
`
    }
    hiveSdkSetup += `
    }
}    
`;
    
    await new Promise((resolve, reject) => {
      fs.writeFile(path.join(opts.outputDir, 'HiveMP.cs'), code, (err) => {
        if (err) {
          reject(err);
          return;
        }
        fs.writeFile(path.join(opts.outputDir, 'RetryableHttpClient.cs'), httpClient, (err) => {
          if (err) {
            reject(err);
            return;
          }
          fs.writeFile(path.join(opts.outputDir, 'HiveMPException.cs'), hiveException, (err) => {
            if (err) {
              reject(err);
              return;
            }
            fs.writeFile(path.join(opts.outputDir, 'HiveMPSystemError.cs'), hiveSystemError, (err) => {
              if (err) {
                reject(err);
                return;
              }
              fs.writeFile(path.join(opts.outputDir, 'HiveMPSDKSetup.cs'), hiveSdkSetup, (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                resolve();
              });
            });
          });
        });
      });
    });
    await this.postGenerate(opts);
  }
}

export class CSharp35Generator extends CSharpGenerator {
  get name(): string {
    return 'CSharp-3.5';
  }

  getDefines(): string {
    return '#define NET35';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    await super.postGenerate(opts);

    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/HiveMP.csproj"), path.join(opts.outputDir, "HiveMP.csproj"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/HiveMP.sln"), path.join(opts.outputDir, "HiveMP.sln"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/packages.config"), path.join(opts.outputDir, "packages.config"));
  }
}

export class CSharp45Generator extends CSharpGenerator {
  get name(): string {
    return 'CSharp-4.5';
  }
  
  getDefines(): string {
    return '';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    await super.postGenerate(opts);

    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.csproj"), path.join(opts.outputDir, "HiveMP.csproj"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.sln"), path.join(opts.outputDir, "HiveMP.sln"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.nuspec"), path.join(opts.outputDir, "HiveMP.nuspec"));
  }
}

export class UnityGenerator extends CSharpGenerator {
  get name(): string {
    return 'Unity';
  }
  
  getDefines(): string {
    return '';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    await super.postGenerate(opts);

    // Copy Unity promise code.
    const promiseCode = `
//------------------------
// <auto-generated>
//     Generated with HiveMP SDK Generator
// </auto-generated>
//------------------------

${this.getDefines()}

#if UNITY_5 || UNITY_5_3_OR_NEWER
#define IS_UNITY
#endif

#if (NET35 || (IS_UNITY && !NET_4_6))

using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace HiveMP.Api
{
    /// <summary>
    /// Much like a ES6 Promise, this class provides a way of asynchronously
    /// notifying the caller that a HiveMP operation has finished. This class
    /// is not available under .NET 4.5 or higher where C# provides native 
    /// await / async, so if you're currently using .NET 3.5 in your current
    /// Unity project, you'll need to migrate to using await / async calls.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    public class HiveMPUnityPromise<T>
    {
        private readonly Action<T> _resolve;
        private readonly Action<HiveMPException> _reject;
        private bool _hasT;
        private T _t;
        private HiveMPException _ex;

        public HiveMPUnityPromise(Func<T> task, Action<T> resolve, Action<HiveMPException> reject)
        {
            _resolve = resolve;
            _reject = reject;

            StartCoroutine(WaitUntilResult());
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    _t = task();
                    _hasT = true;
                }
                catch (HiveMPException ex)
                {
                    _ex = ex;
                }
                catch
                {
                    // Ignore all other exceptions.
                }
            });
        }

        private static GameObject _hiveCallbackObject;
        private static MonoBehaviour _hiveCallbackBehaviour;

        private static void StartCoroutine(IEnumerator e)
        {
            if (_hiveCallbackObject == null)
            {
                _hiveCallbackObject = new GameObject();
                _hiveCallbackBehaviour = _hiveCallbackObject.AddComponent<HiveMPUnityCallbackMonoBehaviour>();
            }

            _hiveCallbackBehaviour.StartCoroutine(e);
        }

        private IEnumerator<object> WaitUntilResult()
        {
            yield return new WaitForFixedUpdate();

            while (!_hasT && _ex == null)
            {
                yield return new WaitForFixedUpdate();
            }

            if (_hasT)
            {
                _resolve(_t);
            }
            else
            {
                _reject(_ex);
            }
        }
    }

    public class HiveMPUnityCallbackMonoBehaviour : MonoBehaviour
    {
        public void Start()
        {
            DontDestroyOnLoad(gameObject);
        }
    }
}

#endif
`;

    await new Promise((resolve, reject) => {
      fs.writeFile(path.join(opts.outputDir, 'HiveMPUnityPromise.cs'), promiseCode, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });

    // Copy Unity-specific dependencies out.
    await new Promise<void>((resolve, reject) => {
      fs.copy("sdks/Unity/", opts.outputDir, { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    if (opts.enableClientConnect) {
      await new Promise<void>((resolve, reject) => {
        fs.copy("sdks/Unity-ClientConnect/", opts.outputDir, { overwrite: true }, (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    }
  }
}
