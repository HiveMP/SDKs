import { IApiSpec } from "../common/apiSpec";
import { resolveType } from "./typing";
import { isErrorStructure } from "../common/error";
import { usedDeserializer } from "./context";
export { isErrorStructure } from "../common/error";

export function emitCommonErrorStructures(api: IApiSpec) {
  let code = '';
  for (const definition of api.definitions.values()) {
    if (isErrorStructure(definition.name)) {
      const csType = resolveType(definition);
      code += csType.emitInterfaceDefinition(definition);
      if (definition.name == 'HiveMPSystemError') {
        usedDeserializer(definition);
      }
    }
  }
  return code;
}