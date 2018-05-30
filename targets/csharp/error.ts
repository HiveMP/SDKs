import { IApiSpec } from "../common/apiSpec";
import { resolveType } from "./typing";

function isErrorStructure(definitionName: string) {
  return definitionName == 'HiveSystemError' ||
    definitionName == 'HiveMPSystemError' ||
    definitionName == 'HiveSystemErrorData' ||
    definitionName == 'HiveMPSystemErrorData' ||
    definitionName == 'HiveMPSystemQueryError';
}

export function emitCommonErrorStructures(api: IApiSpec) {
  let code = '';
  for (const definition of api.definitions.values()) {
    if (isErrorStructure(definition.name)) {
      const csType = resolveType(definition);
      code += csType.emitStructureDefinition(definition);
    }
  }
  return code;
}