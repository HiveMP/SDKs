import { ITypeScriptType, resolveType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { normalizeTypeName } from "../../common/normalize";

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

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    let impl = `
function deserialize_${spec.normalizedName}(val: any): ${this.getTypeScriptType(spec)} | null {
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
    return `
${info.into} = deserialize_${normalizeTypeName(info.spec.schema)}(${info.from});
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    let impl = `
function serialize_${spec.normalizedName}(val: ${this.getTypeScriptType(spec)} | null): any {
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
    return `
${info.into} = ${info.from};
`;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}