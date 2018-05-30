import { IParameterSpec } from "../common/typeSpec";
import { resolveType } from "./typing";

export function getParametersFromMethodParameters(parameters: Set<IParameterSpec>): string {
  let parametersArr = [];
  if (parameters != null) {
    for (const parameter of parameters) {
      let name = parameter.name;
      if (name == "cancellationToken") {
        name = "_cancellationToken";
      }
      const csType = resolveType(parameter);
      parametersArr.push(
        csType.getCSharpType(parameter) +
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