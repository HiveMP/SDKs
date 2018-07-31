import { IMethodSpec } from "../common/methodSpec";
import { getReturnTypes } from "./return";
import * as fragments from './fragments';
import { resolveType } from "./typing";

function getParameterQueryLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    if (parameter.in == "query") {
      const csType = resolveType(parameter);
      code += (csType.pushOntoQueryStringArray(parameter) || '');
    }
  }
  return code;
}

function getParameterBodyLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    let name = parameter.name;
    if (parameter.in == "body") {
      code += `
          request.send(JSON.stringify(req.${name}, replaceValue));
`;
      break;
    }
  }
  return code;
}

export function emitImplementationMethodDeclarations(spec: IMethodSpec) {
  const methodName = spec.operationId;
  const returnTypes = getReturnTypes(spec);
  
  const parameterBodyLoadingCode = getParameterBodyLoadingCode(spec);
  const parameterQueryLoadingCode = getParameterQueryLoadingCode(spec);

  let implementor = fragments.implementationMethodDeclarations;

  return implementor({
    apiId: spec.apiId,
    methodName,
    methodOperationId: spec.operationId,
    methodPath: spec.path,
    methodHttpMethod: spec.method.toUpperCase(),
    parameterBodyLoadingCode,
    parameterQueryLoadingCode,
    returnTypes: returnTypes,
  });
}

export function emitRequestClassForMethod(spec: IMethodSpec) {
  let code = `
  export interface ${spec.operationId}Request {
  `;
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    if (parameter.required) {
      code += `
        ${parameter.name}: ${csType.getTypeScriptType(parameter)};
`;
    } else {
      code += `
        ${parameter.name}?: ${csType.getTypeScriptType(parameter)};
`;
    }
  }
  code += `
    }
`;
  return code;
}