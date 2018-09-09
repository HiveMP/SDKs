import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class ObjectType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'object' &&
      spec.mapValue === undefined;
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return 'Newtonsoft.Json.Linq.JContainer';
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