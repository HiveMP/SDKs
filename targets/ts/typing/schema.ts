import { ITypeScriptType, resolveType } from "../typing";
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
      code += `
  ${property.name}${undefinedFlag}: ${csType.getTypeScriptType(property)} | null;
`;
    }
    code += `
}`;

    return code;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}