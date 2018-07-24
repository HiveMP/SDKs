import { IApiSpec } from "../common/apiSpec";
import { camelCase } from "./naming";
import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { escapeForXmlComment } from "./escape";
import * as fragments from './fragments';
import { getReturnTypes } from "./return";
import { emitInterfaceMethodDeclarations, emitImplementationMethodDeclarations, emitRequestClassForMethod, emitWebSocketClassForMethod } from "./methods";
import { TargetOptions } from "../TargetOptions";

export function emitControllerAndImplementation(api: IApiSpec, tag: string, opts: TargetOptions) {
  let startupCode = '';
  if (!(tag == 'Files' && api.apiId == 'client-connect')) {
    startupCode = `
  static ${tag}Client()
  {
      HiveMP.Api.HiveMPSDK.EnsureInited();
  }`;
  }

  // Declare interface for client.
  let code = fragments.interfacePrefix(tag);
  for (const method of api.methods) {
    if (method.tag !== tag) {
      continue;
    }
    if (method.isClusterOnly && !opts.includeClusterOnly) {
      continue;
    }

    code += emitInterfaceMethodDeclarations(method);
  }
  code += fragments.interfaceSuffix;

  // Declare implementation for client.
  code += fragments.implementationPrefix({
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

    code += emitImplementationMethodDeclarations(method);
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

    code += emitRequestClassForMethod(method);
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

    code += emitWebSocketClassForMethod(method);
  }

  return code;
}