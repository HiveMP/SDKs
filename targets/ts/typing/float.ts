import { ITypeScriptType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class FloatType implements ITypeScriptType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'number' &&
      (spec.format === 'float' ||
      spec.format === 'double');
  }

  public getTypeScriptType(spec: ITypeSpec): string {
    return 'number';
  }

  public emitInterfaceDefinition(spec: IDefinitionSpec): string {
    return null;
  }
}