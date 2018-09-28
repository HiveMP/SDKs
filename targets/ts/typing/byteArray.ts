import { ITypeScriptType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { usedB64Decode, usedB64Encode } from "../context";

export class ByteArrayType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format === 'byte';
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'ArrayBuffer';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    usedB64Decode();
    return `
if (${info.from} !== null && ${info.from} !== undefined) {
  ${info.into} = decodeb64(${info.from});
} else {
  ${info.into} = null;
}
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    usedB64Encode();
    return `
if (${info.from} !== null && ${info.from} !== undefined) {
  ${info.into} = encodeb64(${info.from});
} else {
  ${info.into} = null;
}
`;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    usedB64Encode();
    if (spec.required) {
      return `qs["${spec.name}"] = encodeb64(req.${spec.name});`;
    } else {
      return `if (req.${spec.name} !== undefined) {
        qs["${spec.name}"] = encodeb64(req.${spec.name});
      }`;
    }
  }
}