import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class StringType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte';
  }
  
  public getCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    return 'string';
  }

  public getNonNullableCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    return this.getCSharpType(genericNamespace, spec);
  }

  public emitStructureDefinition(genericNamespace: string, spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(genericNamespace: string, spec: IParameterSpec): string | null {
    const name = camelCase(spec.name);
    let code = '';
    if (spec.required) {
      code += `
if (arguments.${name} == null || arguments.${name}.Trim() == "")
{
    throw ConvertException(new ${genericNamespace}.HiveMPException(400, new ${genericNamespace}.HiveMPSystemError
    {
        Code = 1003,
        Message = "The parameter '${spec.name}' is missing or invalid",
        Fields = "You must provide a value for this parameter, but none was given",
        Data = new ${genericNamespace}.HiveMPSystemErrorData
        {
            ParameterName = "${spec.name}",
            ParameterIsMissing = true,
            ParameterInvalidReason = "You must provide a value for this parameter, but none was given",
        }
    }));
}`;
    }
    code += `
if (arguments.${name} != null && arguments.${name}.Trim() != "") urlBuilder_.Append("${spec.name}=").Append(System.Uri.EscapeDataString(arguments.${name})).Append("&");`;
    return code;
  }
}