import { IApiSpec } from "../common/apiSpec";
import * as fragments from './fragments';
import { emitInterfaceMethodDeclarations, emitImplementationMethodDeclarations, emitRequestClassForMethod, emitWebSocketClassForMethod } from "./methods";
import { TargetOptions } from "../TargetOptions";

export function emitControllerAndImplementation(genericNamespace: string, api: IApiSpec, tag: string, opts: TargetOptions) {
  let startupCode = '';
  if (!(tag == 'Files' && api.apiId == 'client-connect')) {
    startupCode = `
  static ${tag}Client()
  {
      ${genericNamespace}.HiveMPSDK.EnsureInited();
  }`;
  }

  // Declare interface for client.
  let code = fragments.interfacePrefix(genericNamespace, tag);
  for (const method of api.methods) {
    if (method.tag !== tag) {
      continue;
    }
    if (method.isClusterOnly && !opts.includeClusterOnly) {
      continue;
    }

    code += emitInterfaceMethodDeclarations(genericNamespace, method);
  }
  code += fragments.interfaceSuffix;

  // Declare implementation for client.
  code += fragments.implementationPrefix({
    genericNamespace, 
    tag: tag,
    startupCode: startupCode,
    apiId: api.apiId,
    apiName: api.name,
    apiBasePath: api.basePath,
  });
  for (const method of api.methods) {
    if (method.tag !== tag) {
      continue;
    }
    if (method.isClusterOnly && !opts.includeClusterOnly) {
      continue;
    }

    code += emitImplementationMethodDeclarations(genericNamespace, method);
  }
  code += fragments.implementationSuffix;
  
  // Declare request classes.
  for (const method of api.methods) {
    if (method.tag !== tag) {
      continue;
    }
    if (method.isClusterOnly && !opts.includeClusterOnly) {
      continue;
    }

    code += emitRequestClassForMethod(genericNamespace, method);
  }

  // Declare WebSocket classes.
  for (const method of api.methods) {
    if (method.tag !== tag) {
      continue;
    }
    if (method.isClusterOnly && !opts.includeClusterOnly) {
      continue;
    }
    if (!method.isWebSocket) {
      continue;
    }

    code += emitWebSocketClassForMethod(genericNamespace, method);
  }

  return code;
}