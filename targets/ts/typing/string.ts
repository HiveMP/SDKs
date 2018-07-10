import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class StringType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte';
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'string';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }
}