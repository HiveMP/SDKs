import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { camelCase } from "../naming";

export class IntegerType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'integer' &&
      (spec.format === 'int32' ||
      spec.format === 'int64');
  }
  
  public getCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    if (spec.format === 'int32') {
      return 'int?';
    } else {
      return 'long?';
    }
  }

  public getNonNullableCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    if (spec.format === 'int32') {
      return 'int';
    } else {
      return 'long';
    }
  }

  public emitStructureDefinition(genericNamespace: string, spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(genericNamespace: string, spec: IParameterSpec): string | null {
    const name = camelCase(spec.name);
    let code = '';
    if (spec.required) {
      code += `
if (!arguments.${name}.HasValue) 
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
if (arguments.${name}.HasValue) urlBuilder_.Append("${spec.name}=").Append(System.Uri.EscapeDataString(arguments.${name}.Value.ToString())).Append("&");`;
    return code;
  }
}