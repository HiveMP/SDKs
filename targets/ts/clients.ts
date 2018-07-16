import { IApiSpec } from "../common/apiSpec";
import * as fragments from './fragments';
import { emitImplementationMethodDeclarations, emitRequestClassForMethod } from "./methods";
import { TargetOptions } from "../TargetOptions";

export function emitClient(api: IApiSpec, tag: string, opts: TargetOptions) {
  let code = '';

  // Declare client.
  code += fragments.clientPrefix({
    tag: tag,
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
  code += fragments.clientSuffix;
  
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