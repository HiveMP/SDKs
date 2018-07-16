import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class IntegerType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return (spec.type === 'integer' &&
      (spec.format === 'int32' ||
      spec.format === 'int64')) &&
      (spec.name === undefined ||
      !spec.name.endsWith("Utc"));
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'number';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    if (spec.required) {
      return `qs["${spec.name}"] = req.${spec.name}.toString();`;
    } else {
      return `if (req.${spec.name} !== undefined) {
        qs["${spec.name}"] = req.${spec.name}.toString();
      }`;
    }
  }
}