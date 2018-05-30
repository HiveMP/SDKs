import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class MapType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'map' &&
      spec.mapValue !== undefined;
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return 'System.Collections.Generic.Dictionary<string, ' + resolveType(spec.mapValue).getCSharpType(spec.mapValue) + '>';
  }

  public getNonNullableCSharpType(spec: ITypeSpec): string {
    return this.getCSharpType(spec);
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}