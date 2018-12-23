import { IDefinitionSpec, loadDefinitions } from "./typeSpec";
import { IMethodSpec, loadMethods } from "./methodSpec";
import { loadTags } from "./tags";
import { apiNames } from "./apiNames";

export interface IApiSpec {
  apiId: string;
  apiVersion: string;
  name: string;
  document: any;
  namespace: string;
  definitions: Map<string, IDefinitionSpec>;
  methods: Set<IMethodSpec>;
  tags: Set<string>;
  basePath: string;
}

/**
 * Loads the Swagger API into an API specification.
 * 
 * @param apiId The API ID.
 * @param document The Swagger API document.
 */
export function loadApi(
  apiId: string, 
  apiVersion: string,
  document: any, 
  namespaceGenerator: (apiId: string, apiVersion: string, document: any) => string,
  definitionNameGenerator: (definitionSpec: IDefinitionSpec) => string): IApiSpec {
  const namespace = namespaceGenerator(apiId, apiVersion, document);
  const definitions = loadDefinitions(apiId, document, namespace, definitionNameGenerator);
  const methods = loadMethods(apiId, document, namespace);
  const tags = loadTags(apiId, document, namespace);

  return {
    apiId: apiId,
    apiVersion: apiVersion,
    name: apiNames[apiId],
    basePath: document.basePath,
    document: document,
    namespace: namespace,
    definitions: definitions,
    methods: methods,
    tags: tags,
  };
}