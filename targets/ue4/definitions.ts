import { resolveType } from "./typing";
import { IDefinitionSpec } from "../common/typeSpec";

/**
 * Returns the emitted C++ structure definition for the API type definition.
 *  
 * @param emittedDefinitions A list of definitions that have had their structure definitions emitted.
 * @param definitions A full map of the definitions in the document.
 * @param definitionName The definition to be emitted.
 */
export function emitDefinitionAndDependencies(
  emittedDefinitions: Set<string>, 
  definitions: Map<string, IDefinitionSpec>, 
  definitionName: string,
  chain?: string[]): string {
  if (chain === undefined) {
    chain = [];
  }
  chain = [...chain, definitionName];
  if (chain.length > 10) {
    throw new Error('recursive dependency on definitions detected: ' + JSON.stringify(chain, null, 2));
  }
  if (emittedDefinitions.has(definitionName)) {
    // This definition has already been emitted.
    return '';
  }
  const value = definitions.get(definitionName);
  const ueType = resolveType(value);
  const dependencies = ueType.getDependencies(value);
  let result = '';
  for (const dependency of dependencies) {
    result += this.emitDefinitionAndDependencies(
      emittedDefinitions,
      definitions,
      dependency,
      chain);
  }
  const structure = ueType.emitStructureDefinition(value);
  if (structure !== null) {
    result += structure;
  }
  emittedDefinitions.add(definitionName);
  return result;
}