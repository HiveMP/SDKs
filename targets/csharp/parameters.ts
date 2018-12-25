import { IParameterSpec } from "../common/typeSpec";
import { resolveType } from "./typing";

export function getParametersFromMethodParameters(genericNamespace: string, parameters: Set<IParameterSpec>): string {
  let parametersArr = [];
  if (parameters != null) {
    for (const parameter of parameters) {
      let name = parameter.name;
      if (name == "cancellationToken") {
        name = "_cancellationToken";
      }
      const csType = resolveType(parameter);
      parametersArr.push(
        csType.getCSharpType(genericNamespace, parameter) +
        " @" + 
        name
      );
    }
  }
  return parametersArr.join(", ");
}

export function getArgumentsFromMethodParameters(parameters: Set<IParameterSpec>): string {
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