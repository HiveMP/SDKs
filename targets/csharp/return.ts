import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";

export interface IMethodReturnTypes {
  syncType: string;
  asyncType: string;
  promiseType: string;
}

export function getReturnTypes(spec: IMethodSpec): IMethodReturnTypes {
  let returnValue = 'void';
  let asyncReturnValue = 'System.Threading.Tasks.Task';
  let promiseResolve = 'System.Action';
  if (spec.response != null) {
    const csType = resolveType(spec.response);
    returnValue = csType.getNonNullableCSharpType(spec.response);
    asyncReturnValue = 'System.Threading.Tasks.Task<' + returnValue + '>';
    promiseResolve = 'System.Action<' + returnValue + '>';
  }
  return {
    syncType: returnValue,
    asyncType: asyncReturnValue,
    promiseType: promiseResolve,
  };
}