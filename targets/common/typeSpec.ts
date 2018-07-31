import { stripDefinition } from "./definition";
import { normalizeTypeName } from "./normalize";
import { apiNames } from "./apiNames";

export interface ITypeSpec {
  type?:
    "string" |
    "number" |
    "integer" |
    "boolean" |
    "array" |
    "object" |
    "map";
  format?: string;
  items?: ITypeSpec;
  mapValue?: ITypeSpec;
  schema?: string;
  namespace?: string;
  apiFriendlyName?: string;
  document?: any;
  name?: string;
}

export interface IParameterSpec extends ITypeSpec {
  in?: "query" | "body";
  description?: string;
  required?: boolean;
}

export interface IDefinitionSpec extends ITypeSpec {
  normalizedName?: string;
  description?: string;
  properties?: IPropertySpec[];
}

export interface IPropertySpec extends ITypeSpec {
  description?: string;
}

export interface ITypeContext {
  namespace: string;
  apiId: string;
  document: any;
  obj: any;
}

export interface ITypeContextWithName extends ITypeContext {
  name: string;
}

export function convertGeneric(context: ITypeContext): ITypeSpec {
  if (context.obj.type !== undefined) {
    if (context.obj.type === 'array') {
      return {
        type: 'array',
        document: context.document,
        items: convertGeneric({
          namespace: context.namespace, 
          apiId: context.apiId,
          document: context.document,
          obj: context.obj.items,
        }),
      };
    } else if (context.obj.type === 'object' && context.obj.additionalProperties !== undefined) {
      return {
        type: 'map',
        mapValue: convertGeneric({
          namespace: context.namespace, 
          apiId: context.apiId,
          document: context.document,
          obj: context.obj.additionalProperties,
        }),
        document: context.document,
        format: context.obj.format,
      };
    } else {
      return {
        type: context.obj.type,
        document: context.document,
        format: context.obj.format,
      };
    }
  }

  if (context.obj.$ref !== undefined) {
    return {
      namespace: context.namespace,
      apiFriendlyName: apiNames[context.apiId],
      document: context.document,
      schema: stripDefinition(context.obj.$ref),
    };
  }

  if (context.obj.schema !== undefined) {
    return convertGeneric({
      namespace: context.namespace,
      apiId: context.apiId, 
      document: context.document,
      obj: context.obj.schema,
    });
  }

  throw new Error('Unable to convert Swagger type info to type spec: ' + JSON.stringify(context.obj, null, 2));
}

export function convertProperty(context: ITypeContextWithName): IPropertySpec {
  const def = convertGeneric(context) as IPropertySpec;
  def.name = context.name;
  def.description = context.obj.description;
  return def;
}

export function convertParameter(context: ITypeContext): IParameterSpec {
  const def = convertGeneric(context) as IParameterSpec;
  def.name = context.obj.name;
  def.description = context.obj.description;
  def.in = context.obj.in;
  def.required = context.obj.required;
  return def;
}

export function convertDefinition(context: ITypeContextWithName): IDefinitionSpec {
  const def: IDefinitionSpec = convertGeneric(context) as IDefinitionSpec;
  def.name = context.name;
  def.normalizedName = normalizeTypeName(context.name);
  def.description = context.obj.description;
  const properties = [];
  for (const propertyName in context.obj.properties) {
    if (context.obj.properties.hasOwnProperty(propertyName)) {
      properties.push(convertProperty({
        namespace: context.namespace,
        apiId: context.apiId,
        document: context.document,
        obj: context.obj.properties[propertyName],
        name: propertyName,
      }));
    }
  }
  return {
    name: context.name,
    apiFriendlyName: apiNames[context.apiId],
    normalizedName: normalizeTypeName(context.name),
    description: context.obj.description,
    namespace: context.namespace,
    document: context.document,
    schema: context.name,
    properties: properties,
  };
}

/**
 * Loads the Swagger API definitions into definition specifications.
 * 
 * @param apiId The API ID.
 * @param document The Swagger API document.
 * @param namespace The namespace for types in this document. 
 */
export function loadDefinitions(apiId: string, document: any, namespace: string, definitionNameFactory: (definitionSpec: IDefinitionSpec) => string): Map<string, IDefinitionSpec> {
  const definitions = new Map<string, IDefinitionSpec>();
  for (const defName in document.definitions) {
    const definitionSpec = convertDefinition({
      apiId: apiId,
      namespace: namespace,
      document: document,
      obj: document.definitions[defName],
      name: defName,
    });
    definitions.set(
      definitionNameFactory(definitionSpec),
      definitionSpec);
  }
  return definitions;
}