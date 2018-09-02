import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class EnumType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte' &&
      spec.enum !== undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    const enums = spec.enum.map((value) => '\'' + value.replace('\\', '\\\\').replace('\'', '\\\'') + '\'');
    return enums.join(' | ');
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    if (spec.required) {
      return `qs["${spec.name}"] = req.${spec.name};`;
    } else {
      return `if (req.${spec.name} !== undefined) {
        qs["${spec.name}"] = req.${spec.name};
      }`;
    }
  }
}