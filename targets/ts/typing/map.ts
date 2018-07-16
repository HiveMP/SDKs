import { ITypeScriptType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class MapType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'map' &&
      spec.mapValue !== undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return '{ [key: string]: ' + resolveType(spec.mapValue).getTypeScriptType(spec.mapValue) + ' }';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}