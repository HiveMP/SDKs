import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec } from '../../common/typeSpec';

export class ObjectType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'object' &&
      spec.mapValue === undefined;
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'any';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }
}