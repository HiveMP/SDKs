import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlescape from 'xml-escape';
import { TargetGenerator, GeneratorUtility } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";

export class MuJsTypeScriptGenerator implements TargetGenerator {
  get name(): string {
    return 'MuJS-TypeScript';
  }

  static stripDefinition(s: string): string {
    if (s.startsWith('#/definitions/')) {
      return s.substr('#/definitions/'.length).replace(/(\[|\])/g, '');
    }
    return s.replace(/(\[|\])/g, '');
  }

  static getTypeScriptTypeFromDefinition(namespace: string, nameHint: string, definition: schema.Definition, useConst: boolean, useConstIn?: boolean, isResponse?: boolean): string {
    const constName = useConst ? 'const ' : '';
    const arrayConstName = useConstIn ? 'const ': '';
    const arrayConstSuffix = useConstIn ? '&' : '';
    const nullableSuffix = (definition.required || isResponse) ? '' : ' | null';
    let type = null;
    try {
      if (definition.type != null) {
        switch (definition.type as string|null) {
          case 'string':
            switch (definition.format) {
              case 'byte':
                type = 'Buffer';
                break;
              default:
                type = 'string';
                break;
            }
            break;
          case 'integer':
            if (nameHint.endsWith('Utc')) {
              type = 'moment.Moment';
            } else {
              switch (definition.format) {
                case 'int32':
                  type = 'number' + nullableSuffix;
                  break;
                case 'int64':
                  type = 'number' + nullableSuffix;
                  break;
              }
            }
            break;
          case 'number':
            switch (definition.format) {
              case 'float':
                type = 'number' + nullableSuffix;
                break;
              case 'double':
                type = 'number' + nullableSuffix;
                break;
            }
            break;
          case 'boolean':
            type = 'boolean' + nullableSuffix;
            break;
          case 'object':
            if ((definition as any).additionalProperties != null) {
              // This is a dictionary.
              type = '{ [key: string]: ' + MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, (definition as any).additionalProperties, false, useConstIn) + ' }';
            } else {
              type = 'any';
            }
            break;
          case 'array':
            type = 
            MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.items, false, useConstIn, isResponse) +
              '[]';
            break;
        }
      } else if (definition.schema != null) {
        if (definition.schema.type == 'array') {
          type = 
            MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.schema.items, false, useConstIn, isResponse) +
            '[]';
        } else if (definition.schema.$ref != null) {
          type = namespace + '.' + MuJsTypeScriptGenerator.stripDefinition(definition.schema.$ref);
        } else {
          return MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.schema, useConst, useConstIn, isResponse);
        }
      } else if (definition.$ref != null) {
        type = namespace + '.' + MuJsTypeScriptGenerator.stripDefinition(definition.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      type = 'any' + nullableSuffix + ' /* unknown */';
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
          MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, name, parameter, false) +
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
    let code = `
/**
 * Generated with the HiveMP SDK Generator
 */

import { Buffer } from '../buffer';
import * as moment from 'moment';

export namespace HiveMP {
`;

    for (let apiId in documents) {
      let api = documents[apiId];
      let csharpName = api.info["x-sdk-csharp-package-name"];
      let namespace = csharpName.substr("HiveMP.".length);

      let isFirstEntryInNamespace = true;

      code += `  export namespace ${namespace} {
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
        if (GeneratorUtility.isCommonDefinitionName(definitionName)) {
          continue;
        }

        if (isFirstEntryInNamespace) {
          isFirstEntryInNamespace = false;
        } else {
          code += `
`;        
        }

        const className = definitionName.replace(/(\[|\])/g, '');
        code += `    export interface ${className} {
`;
        for (let propertyName in api.definitions[definitionName].properties) {
          let propertyValue = api.definitions[definitionName].properties[propertyName];
          let propertyType = MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, propertyName, propertyValue, false);
          code += `      ${propertyName}: ${propertyType};
`;
        }
        code += `    }
`;
      }

      /*

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
            returnValue = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, methodValue.responses["200"], false, false, true);
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
            returnValue = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, methodValue.responses["200"], false, false, true);
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
              let csharpType = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, parameter, false);
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
              let csharpType = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, parameter, false);
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
              let csharpType = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, parameter, false);
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
              let csharpType = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, parameter, false);
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
              let csharpType = CSharpGenerator.getTypeScriptTypeFromDefinition(namespace, parameter, false);
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

    */
      code += `  }

`;
    }

    code += `}
`;

    await new Promise((resolve, reject) => {
      console.log('writing to ' + path.join(opts.outputDir, 'index.ts'));
      fs.writeFile(path.join(opts.outputDir, 'index.ts'), code, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

