import { IDefinitionSpec, loadDefinitions } from "./typeSpec";
import { IMethodSpec, loadMethods } from "./methodSpec";

export interface IApiSpec {
  apiId: string;
  document: any;
  namespace: string;
  definitions: Map<string, IDefinitionSpec>;
  methods: Set<IMethodSpec>;
}

/**
 * Loads the Swagger API into an API specification.
 * 
 * @param apiId The API ID.
 * @param document The Swagger API document.
 */
export function loadApi(apiId: string, document: any): IApiSpec {
  const namespace = apiId.replace(/-/g, '_');
  const definitions = loadDefinitions(apiId, document, namespace);
  const methods = loadMethods(apiId, document, namespace);

  return {
    apiId: apiId,
    document: document,
    namespace: namespace,
    definitions: definitions,
    methods: methods,
  };
}