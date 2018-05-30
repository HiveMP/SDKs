import { IApiSpec } from "../common/apiSpec";
import { camelCase } from "./naming";
import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { escapeForXmlComment } from "./escape";
import * as fragments from './fragments';
import { getReturnTypes } from "./return";
import { emitInterfaceMethodDeclarations, emitImplementationMethodDeclarations, emitRequestClassForMethod } from "./methods";
import { TargetOptions } from "../TargetOptions";

export function emitControllerAndImplementation(api: IApiSpec, tag: string, opts: TargetOptions) {
  let startupCode = '';
  let clientConnectWaitAsync = '';
  let clientConnectWait = '';
  if (!(tag == 'Files' && api.apiId == 'client-connect')) {
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

    code += emitImplementationMethodDeclarations(method, {
      clientConnectWait,
      clientConnectWaitAsync
    });
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

  return code;
}