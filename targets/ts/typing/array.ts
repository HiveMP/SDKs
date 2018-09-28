import { ITypeScriptType, resolveType, ISerializationInfo, IDeserializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class ArrayType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'array';
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return '(' + resolveType(spec.items).getTypeScriptType(spec.items) + ' | null)[]';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    const arrayName = `_A${info.nestLevel}`;
    const itemName = `_I${info.nestLevel}`;
    const itemType = resolveType(info.spec.items);
    return `
{
  const ${arrayName} = ${info.from};
  if (${arrayName} !== null && ${arrayName} !== undefined) {
    ${info.into} = [];
    for (let i = 0; i < ${arrayName}.length; i++) {
      let ${itemName} = null;
      ${itemType.emitDeserializationFragment({
        spec: info.spec.items,
        from: `${arrayName}[i]`,
        into: itemName,
        nestLevel: info.nestLevel + 1,
      })}
      ${info.into}.push(${itemName});
    }
  } else {
    ${info.into} = null;
  }
}
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    const itemName = `_I${info.nestLevel}`;
    const itemType = resolveType(info.spec.items);
    return `
{
  if (${info.from} !== null && ${info.from} !== undefined) {
    ${info.into} = [];
    for (let i = 0; i < ${info.from}.length; i++) {
      let ${itemName} = null;
      ${itemType.emitSerializationFragment({
        spec: info.spec.items,
        from: `${info.from}[i]`,
        into: itemName,
        nestLevel: info.nestLevel + 1,
      })}
      ${info.into}.push(${itemName});
    }
  } else {
    ${info.into} = null;
  }
}
`;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}