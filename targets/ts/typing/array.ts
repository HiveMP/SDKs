import { ITypeScriptType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class ArrayType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'array';
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return resolveType(spec.items).getTypeScriptType(spec.items) + '[]';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}