import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class ObjectType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'object' &&
      spec.mapValue === undefined;
  }
  
  public getCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    return 'Newtonsoft.Json.Linq.JToken';
  }

  public getNonNullableCSharpType(genericNamespace: string, spec: ITypeSpec): string {
    return this.getCSharpType(genericNamespace, spec);
  }

  public emitStructureDefinition(genericNamespace: string, spec: IDefinitionSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(genericNamespace: string, spec: IParameterSpec): string | null {
    return null;
  }
}