import { IMethodSpec } from "../common/methodSpec";
import { camelCase } from "./naming";
import { getReturnTypes, IMethodReturnTypes } from "./return";
import { escapeForXmlComment } from "./escape";
import * as fragments from './fragments';
import { getParametersFromMethodParameters } from "./parameters";
import { resolveType } from "./typing";

export function emitInterfaceMethodDeclarations(spec: IMethodSpec) {
  const methodName = camelCase(spec.operationId);
  const returnTypes = getReturnTypes(spec);

  const methodSummary = escapeForXmlComment(spec.summary, "        /// ");
  const methodDescription = escapeForXmlComment(spec.description, "        /// ");
  const methodNameEscaped = escapeForXmlComment(methodName, " ");

  return fragments.interfaceMethodDeclarations({
    methodSummary: methodSummary,
    methodName: methodName,
    methodNameEscaped: methodNameEscaped,
    methodDescription: methodDescription,
    returnTypes: returnTypes
  });
}

function getRequestClassConstruction(spec: IMethodSpec) {
  let createRequest = `new ${camelCase(spec.operationId)}Request
    {`;
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    let name = camelCase(parameter.name);
    createRequest += `
        ${name} = @${parameter.name},`;
  }
  createRequest += `
    }`;
  return createRequest;
}

function getClientConnectResponseHandler(returnTypes: IMethodReturnTypes) {
  if (returnTypes.syncType === 'void') {
    return `
              return;
`;
  } else {
    return `
              var result_ = default(${returnTypes.syncType}); 
              try
              {
                  result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnTypes.syncType}>(response);
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
  }
}

function getHttpResponseHandler(returnTypes: IMethodReturnTypes) {
  if (returnTypes.syncType === 'void') {
    return '';
  } else {
    return `
                          var result_ = default(${returnTypes.syncType}); 
                          try
                          {
                              result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnTypes.syncType}>(responseData_);
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
}

function getLegacyParameterXmlComments(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
    code += `
/// <param name="${escapeForXmlComment(name, '')}">${escapeForXmlComment(parameter.description, "        /// ")}</param>`;
  }
  return code;
}

function getParameterQueryLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    code += csType.pushOntoQueryStringArray(parameter);
  }
  return code;
}

function getParameterBodyLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    let name = camelCase(parameter.name);
    if (parameter.in == "body") {
      code += `
          content_ = Newtonsoft.Json.JsonConvert.SerializeObject(arguments.${name});
`;
      break;
    }
  }
  return code;
}

export function emitImplementationMethodDeclarations(spec: IMethodSpec, opts: {
  clientConnectWait: string,
  clientConnectWaitAsync: string,
}) {
  const methodName = camelCase(spec.operationId);
  const returnTypes = getReturnTypes(spec);

  const methodSummary = escapeForXmlComment(spec.summary, "        /// ");
  const methodDescription = escapeForXmlComment(spec.description, "        /// ");
  const methodNameEscaped = escapeForXmlComment(methodName, " ");

  const parameterBodyLoadingCode = getParameterBodyLoadingCode(spec);
  const parameterQueryLoadingCode = getParameterQueryLoadingCode(spec);

  const parameterDeclarations = getParametersFromMethodParameters(spec.parameters);
  const parameterDeclarationsSuffix = parameterDeclarations != '' ? ', ' : '';
  const returnSyncPrefix = returnTypes.syncType == 'void' ? '' : 'return ';
  const promiseReturnExtra = returnTypes.syncType == 'void' ? 'return true;' : '';
  const promiseReturnType = returnTypes.syncType == 'void' ? 'bool' : returnTypes.syncType;
  const requestClassConstruction = getRequestClassConstruction(spec);
  const legacyParameterXmlComments = getLegacyParameterXmlComments(spec);

  const clientConnectResponseHandler = getClientConnectResponseHandler(returnTypes);
  const httpResponseHandler = getHttpResponseHandler(returnTypes);

  return fragments.implementationMethodDeclarations({
    apiId: spec.apiId,
    methodName,
    methodNameEscaped,
    methodSummary,
    methodDescription,
    methodOperationId: spec.operationId,
    methodPath: spec.path,
    methodHttpMethod: spec.method.toUpperCase(),
    parameterBodyLoadingCode,
    parameterQueryLoadingCode,
    returnTypes: returnTypes,
    returnSyncPrefix,
    promiseReturnExtra,
    promiseReturnType,
    httpResponseHandler,
    legacyParameterXmlComments,
    parameterDeclarations,
    parameterDeclarationsSuffix,
    requestClassConstruction,
    clientConnectWait: opts.clientConnectWait,
    clientConnectWaitAsync: opts.clientConnectWaitAsync,
    clientConnectResponseHandler,
  });
}

export function emitRequestClassForMethod(spec: IMethodSpec) {
  const name = camelCase(spec.operationId);
  let code = `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public struct ${name}Request
    {
  `;
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    const parameterName = camelCase(parameter.name);
    code += `
        /// <summary>
        /// ${escapeForXmlComment(parameter.description, "        /// ")}
        /// </summary>
        [Newtonsoft.Json.JsonProperty("${parameter.name}")]
        public ${csType.getCSharpType(parameter)} ${parameterName} { get; set; }
`;
  }
  code += `
    }
`;
  return code;
}