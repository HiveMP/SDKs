import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class ByteArrayType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      (spec.format === 'byte' || spec.format === 'binary');
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return 'byte[]';
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
if (arguments.${name} == null)
{
    throw new HiveMP.Api.HiveMPException(400, new HiveMP.Api.HiveMPSystemError
    {
        Code = 1003,
        Message = "The parameter '${spec.name}' is missing or invalid",
        Fields = "You must provide a value for this parameter, but none was given",
        Data = new HiveMP.Api.HiveMPSystemErrorData
        {
            ParameterName = "${spec.name}",
            ParameterIsMissing = true,
            ParameterInvalidReason = "You must provide a value for this parameter, but none was given",
        }
    });
}`;
    }
    code += `
if (arguments.${name} != null) urlBuilder_.Append("${spec.name}=").Append(System.Uri.EscapeDataString(System.Convert.ToBase64String(arguments.${name}))).Append("&");`;
    return code;
  }
}