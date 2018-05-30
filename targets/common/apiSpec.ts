import { IDefinitionSpec, loadDefinitions } from "./typeSpec";
import { IMethodSpec, loadMethods } from "./methodSpec";
import { loadTags } from "./tags";
import { apiNames } from "./apiNames";

export interface IApiSpec {
  apiId: string;
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
export function loadApi(apiId: string, document: any, namespaceGenerator: (apiId: string, document: any) => string): IApiSpec {
  const namespace = namespaceGenerator(apiId, document);
  const definitions = loadDefinitions(apiId, document, namespace);
  const methods = loadMethods(apiId, document, namespace);
  const tags = loadTags(apiId, document, namespace);

  return {
    apiId: apiId,
    name: apiNames[apiId],
    basePath: document.basePath,
    document: document,
    namespace: namespace,
    definitions: definitions,
    methods: methods,
    tags: tags,
  };
}