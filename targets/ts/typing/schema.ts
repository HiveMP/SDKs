import { ITypeScriptType, resolveType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { normalizeTypeName } from "../../common/normalize";
import { usedDeserializer, usedSerializer } from "../context";
import { isErrorStructure } from "../error";

export class SchemaType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.schema !== undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    if (spec.schema.startsWith('PaginatedResults[')) {
      // We provide this as a generic type in TypeScript.
      return spec.schema.replace(/\[/g, '<').replace(/\]/g, '>');
    }

    return normalizeTypeName(spec.schema);
  }

  public getFullNamespaceTypeScriptType(spec: ITypeSpec): string {
    if (isErrorStructure(spec.schema)) {
      return normalizeTypeName(spec.schema);
    }

    if (spec.schema.startsWith('PaginatedResults[')) {
      // We provide this as a generic type in TypeScript.
      return spec.schema.replace(/\[/g, '<' + spec.namespace + '.').replace(/\]/g, '>');
    }

    return spec.namespace + '.' + normalizeTypeName(spec.schema);
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    if (spec.name.startsWith('PaginatedResults[')) {
      // We provide this as a generic type in TypeScript.
      return '';
    }

    const className = spec.name.replace(/(\[|\])/g, '');

    let code = `
export interface ${className} {
`;
    for (const property of spec.properties) {
      const csType = resolveType(property);
      const undefinedFlag = className == 'HiveMPSystemErrorData' ? '?' : '';
      if (spec.name.startsWith("Paginated") && (property.name == 'moreResults' || property.name == 'results')) {
        // The API doesn't yet declare whether schema fields are nullable (since C# nullable reference types
        // haven't shipped yet). In this case we want to make moreResults and results fields on paginated
        // schema types non-nullable so they're compatible with PaginatedResults<>.
        code += `
  ${property.name}${undefinedFlag}: ${csType.getTypeScriptType(property)} | null;
`;
      } else {
        code += `
  ${property.name}${undefinedFlag}: ${csType.getTypeScriptType(property)} | null;
`;
      }
    }
    code += `
}`;

    return code;
  }

  private getSerializerName(spec: ITypeSpec) {
    if (isErrorStructure(spec.schema)) {
      return spec.schema;
    }
    return `${spec.namespace}_${normalizeTypeName(spec.schema)}`;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    let impl = `
function deserialize_${this.getSerializerName(spec)}(val: any): ${this.getFullNamespaceTypeScriptType(spec)} | null {
  if (val === null) {
    return null;
  }
`;
    for (const property of spec.properties) {
      const type = resolveType(property);
      const name = `into_${property.name}_0`;
      impl += `
  let ${name} = null;
  ${type.emitDeserializationFragment({
    spec: property,
    from: `val.${property.name}`,
    into: name,
    nestLevel: 0,
  })}
`;
    }
    impl += `
  return {
`;
    for (const property of spec.properties) {
      const name = `into_${property.name}_0`;
      impl += `
    ${property.name}: ${name},
`;
    }
    impl += `
  };
}
`;
    return impl;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    usedDeserializer(info.spec);
    return `
${info.into} = deserialize_${this.getSerializerName(info.spec)}(${info.from});
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    let impl = `
function serialize_${this.getSerializerName(spec)}(val: ${this.getFullNamespaceTypeScriptType(spec)} | null): any {
  if (val === null) {
    return null;
  }
`;
    for (const property of spec.properties) {
      const type = resolveType(property);
      const name = `into_${property.name}_0`;
      impl += `
  let ${name} = null;
  ${type.emitSerializationFragment({
    spec: property,
    from: `val.${property.name}`,
    into: name,
    nestLevel: 0,
  })}
`;
    }
    impl += `
  return {
`;
    for (const property of spec.properties) {
      const name = `into_${property.name}_0`;
      impl += `
    ${property.name}: ${name},
`;
    }
    impl += `
  };
}
`;
    return impl;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    usedSerializer(info.spec);
    return `
${info.into} = serialize_${this.getSerializerName(info.spec)}(${info.from});
`;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}