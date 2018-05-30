import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class BooleanType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'boolean';
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return 'bool?';
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