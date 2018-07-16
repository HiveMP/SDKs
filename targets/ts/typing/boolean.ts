import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class BooleanType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'boolean';
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'boolean';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    if (spec.required) {
      return `qs["${spec.name}"] = req.${spec.name} ? "true" : "false";`;
    } else {
      return `if (req.${spec.name} !== undefined) {
        qs["${spec.name}"] = req.${spec.name} ? "true" : "false";
      }`;
    }
  }
}