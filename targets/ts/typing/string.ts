import { ITypeScriptType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class StringType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte' &&
      spec.enum === undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'string';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    return `
${info.into} = ${info.from};
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    return `
${info.into} = ${info.from};
`;
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