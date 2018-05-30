import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class FloatType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'number' &&
      (spec.format === 'float' ||
      spec.format === 'double');
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    if (spec.format === 'float') {
      return 'float';
    } else {
      return 'double';
    }
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    const name = camelCase(spec.name);
    let code = '';
    if (spec.required) {
      code += `
if (arguments.${name} == null) throw new System.ArgumentNullException("arguments.${name}");`;
    }
    code += `
if (arguments.${name} != null) urlBuilder_.Append("${spec.name}=").Append(System.Uri.EscapeDataString(arguments.${name}.ToString())).Append("&");`;
    return code;
  }
}