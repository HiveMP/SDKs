import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { camelCase } from "./naming";

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
  if (spec.binaryResponseHandling !== undefined) {
    returnValue = 'System.IO.Stream';
    asyncReturnValue = 'System.Threading.Tasks.Task<System.IO.Stream>';
    promiseResolve = 'System.Action<System.IO.Stream>';
  }
  if (spec.isWebSocket) {
    const name = camelCase(spec.operationId);
    returnValue = name + 'Socket';
    asyncReturnValue = 'System.Threading.Tasks.Task<' + returnValue + '>';
    promiseResolve = 'System.Action<' + returnValue + '>';
  }
  return {
    syncType: returnValue,
    asyncType: asyncReturnValue,
    promiseType: promiseResolve,
  };
}