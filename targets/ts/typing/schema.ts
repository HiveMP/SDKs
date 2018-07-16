import { ITypeScriptType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { normalizeTypeName } from "../../common/normalize";

export class SchemaType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.schema !== undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return normalizeTypeName(spec.schema);
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    const className = spec.name.replace(/(\[|\])/g, '');

    let code = `
export interface ${className} {
`;
    for (const property of spec.properties) {
      const csType = resolveType(property);
      code += `
  ${property.name}: ${csType.getTypeScriptType(property)}
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