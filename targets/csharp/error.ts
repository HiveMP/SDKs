import { IApiSpec } from "../common/apiSpec";
import { resolveType } from "./typing";
import { isErrorStructure } from "../common/error";
export { isErrorStructure } from "../common/error";

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