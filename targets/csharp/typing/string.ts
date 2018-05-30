import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class StringType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte';
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return 'string';
  }

  public getNonNullableCSharpType(spec: ITypeSpec): string {
    return this.getCSharpType(spec);
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    const name = camelCase(spec.name);
    let code = '';
    if (spec.required) {
      code += `
if (arguments.${name} == null || arguments.${name}.Trim() == "") throw new System.ArgumentNullException("arguments.${name}");`;
    }
    code += `
if (arguments.${name} != null && arguments.${name}.Trim() != "") urlBuilder_.Append("${spec.name}=").Append(System.Uri.EscapeDataString(arguments.${name})).Append("&");`;
    return code;
  }
}