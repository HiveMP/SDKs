import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { ITypeSpec } from "../common/typeSpec";

export interface IMethodReturnTypes {
  syncType: string;
  promiseType: string;
  originalResponse: ITypeSpec;
}

export function getReturnTypes(spec: IMethodSpec): IMethodReturnTypes {
  let promiseResolve = 'Promise<void>';
  let syncType = 'void';
  if (spec.response != null) {
    const csType = resolveType(spec.response);
    promiseResolve = 'Promise<' + csType.getTypeScriptType(spec.response) + '>';
    syncType = csType.getTypeScriptType(spec.response);
  }
  return {
    syncType: syncType,
    promiseType: promiseResolve,
    originalResponse: spec.response,
  };
}