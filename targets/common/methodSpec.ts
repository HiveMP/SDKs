import { IParameterSpec, ITypeSpec, convertGeneric, convertParameter } from "./typeSpec";
import { escapeForDoubleQuotedString } from "../cpp/escape";
import { apiNames } from "./apiNames";

export interface IMethodSpec {
  /**
   * The API ID.
   */
  apiId: string;

  /**
   * The friendly name of the API.
   */
  apiFriendlyName: string;

  /**
   * The base path for the API.
   */
  basePath: string;

  /**
   * The HTTP path to the API method.
   */
  path: string;

  /**
   * The HTTP method used to invoke the API method.
   */
  method: string;
  
  /**
   * The operation ID for the API method, unique in the namespace.
   */
  operationId: string;

  /**
   * The short summary of the method.
   */
  summary: string;

  /**
   * The full description of the method.
   */
  description: string;

  /**
   * The full description of the method, shortened to always fit within 1000 characters.
   */
  descriptionLimited: string;

  /**
   * The full description within 1000 characters and escaped for a C++ double-quoted string.
   */
  descriptionLimitedEscapedForDoubleQuotes: string;

  /**
   * The display name of the method, for displaying the end user or developer.
   */
  displayName: string;

  /**
   * The display name of the method, escaped for a C++ double-quoted string.
   */
  displayNameEscapedForDoubleQuotes: string;

  /**
   * A unique name suitable for internal methods and variables used to implement the method or functionality.
   */
  implementationName: string;

  /**
   * The method parameters.
   */
  parameters: Set<IParameterSpec>;

  /**
   * The method response / result specification, or null if the method does not
   * return a response.
   */
  response: ITypeSpec | null;
}

/**
 * Loads the Swagger API methods into method specifications.
 * 
 * @param apiId The API ID.
 * @param document The Swagger API document.
 * @param namespace The namespace for types in this document. 
 */
export function loadMethods(apiId: string, document: any, namespace: string): Set<IMethodSpec> {
  const methods = new Set<IMethodSpec>();
  for (const pathName in document.paths) {
    const pathValue = document.paths[pathName];
    for (const methodName in pathValue) {
      const methodValue = pathValue[methodName];

      const operationId: string = methodValue.operationId || '';
      const tag: string = methodValue.tags[0];
      const summary: string = methodValue.summary || '';
      const description: string = methodValue.description || '';

      let displayName = summary.replace(/(?:\r\n|\r|\n)/g, " ");
      if (displayName.indexOf(".") != -1) {
        displayName = displayName.substr(0, displayName.indexOf("."));
      }
      if (displayName.indexOf("  ") != -1) {
        displayName = displayName.substr(0, displayName.indexOf("  "));
      }

      const descriptionLimited: string = description.length > 1000 ? (description.substr(0, 1000) + "...") : description;

      const implementationName = namespace + '_' + tag + '_' + operationId;

      let response: ITypeSpec | null = null;
      if (methodValue.responses !== undefined && methodValue.responses["200"] !== undefined) {
        try {
          response = convertGeneric({
            namespace: namespace,
            apiId: apiId,
            document: document,
            obj: methodValue.responses["200"],
          });
        } catch (ex) {
          // If the response doesn't contain a value type definition, then the method
          // doesn't return a response value.
        }
      }

      let parameters = new Set<IParameterSpec>();
      if (methodValue.parameters !== undefined) {
        for (const parameter of methodValue.parameters) {
          parameters.add(convertParameter({
            namespace: namespace,
            apiId: apiId,
            document: document,
            obj: parameter,
          }))
        }
      }

      methods.add({
        apiId: apiId,
        apiFriendlyName: apiNames[apiId],
        basePath: document.basePath,
        path: pathName,
        method: methodName,
        operationId: operationId,
        summary: summary,
        description: description,
        descriptionLimited: descriptionLimited,
        descriptionLimitedEscapedForDoubleQuotes: escapeForDoubleQuotedString(descriptionLimited),
        displayName: displayName,
        displayNameEscapedForDoubleQuotes: escapeForDoubleQuotedString(displayName),
        implementationName: implementationName,
        parameters: parameters,
        response: response,
      });
    }
  }
  return methods;
}