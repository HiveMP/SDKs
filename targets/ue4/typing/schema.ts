import { IUnrealEngineType, resolveType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { normalizeTypeName } from "../../common/normalize";
import { stripDefinition } from "../../common/definition";
import { escapeForMultilineComment } from "../../cpp/escape";

export class SchemaType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.schema !== null;
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FHive_' + spec.namespace + '_' + normalizeTypeName(spec.schema);
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FHive_' + spec.namespace + '_' + normalizeTypeName(spec.schema) + '&';
  }

  public getNameForDependencyEmit(spec: ITypeSpec): string | null {
    return spec.schema;
  }

  public getDependencies(spec: IDefinitionSpec): string[] {
    return spec.properties.map(value => resolveType(value).getNameForDependencyEmit(value));
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    let structure = `
USTRUCT(BlueprintType, meta=(DisplayName="HiveMP ${spec.apiFriendlyName} ${spec.name}"))
struct FHive${spec.namespace}_${spec.normalizedName}
{
  GENERATED_BODY()
  
  /** In HiveMP, all structs can be nullable in API requests and responses. This property allows you to set or get whether or not the struct is actually null. */
  UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
  bool _IsValid;

`;
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      structure += `
  /** ${escapeForMultilineComment(property.description)} */
  UPROPERTY(BlueprintReadWrite)
  ${ueType.getCPlusPlusInType(property)} ${property.name};
`;
    }
    structure += `
};
`;
    return structure;
  }

  public emitDeserializationHeader(spec: IDefinitionSpec): string | null {
    return `
struct FHive${spec.namespace}_${spec.normalizedName} DeserializeFHive${spec.namespace}_${spec.normalizedName}(TSharedPtr<FJsonObject> obj);
`;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    let code = `
struct FHive${spec.namespace}_${spec.normalizedName} DeserializeFHive${spec.namespace}_${spec.normalizedName}(TSharedPtr<FJsonObject> obj)
{
  struct FHive${spec.namespace}_${spec.normalizedName} Target;

  Target._HasValue = true;

`;
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      const name = `F_${property.name}_0`;
      code += `
  const TSharedPtr<FJsonValue> ${name} = obj->TryGetField(TEXT("${property.name}"));
`;
      code += ueType.emitDeserializationFragment({
        spec: property,
        from: name,
        into: `Target.${property.name}`,
        nestLevel: 0,
      });
    }
    code += `
  return Target;
}
`;
    return code;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    return `
if (!${info.from}}.IsValid() || ${info.from}->IsNull())
{
  ${info.into}._HasValue = false;
}
else
{
  const TSharedPtr<FJsonObject> _O = ${info.from}->AsObject(); 
  ${info.into} = DeserializeFHive${info.spec.namespace}_${normalizeTypeName(info.spec.schema)}(_O);
}
`;
  }

  public emitSerializationHeader(spec: IDefinitionSpec): string | null {
    return `
TSharedPtr<FJsonObject> SerializeFHive${spec.namespace}_${spec.normalizedName}(struct FHive${spec.namespace}_${spec.normalizedName} obj);
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    let code = `
TSharedPtr<FJsonObject> SerializeFHive${spec.namespace}_${spec.normalizedName}(struct FHive${spec.namespace}_${spec.normalizedName} obj)
{
  TSharedPtr<FJsonObject> Target = MakeShareable(new FJsonObject());

`;
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      const name = `F_${property.name}_0`;
      code += `
  TSharedPtr<FJsonValue> ${name};
`;
      code += ueType.emitSerializationFragment({
        spec: property,
        into: name,
        from: `obj.${property.name}`,
        nestLevel: 0,
      });
      code += `
  Target->SetField(TEXT("${property.name}"), ${name});
`;
    }
    code += `

  return Target;
}
`;
    return code;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    return `
if (${info.from}._HasValue)
{
  ${info.into} = SerializeFHive${info.spec.namespace}_${normalizeTypeName(info.spec.schema)}(${info.from});
}
else
{
  ${info.into} = MakeShareable(new FJsonValueNull());
}
`;
  }

  public getAssignmentFrom(spec: ITypeSpec, variable: string): string {
    return variable;
  }

  public getDefaultInitialiser(spec: ITypeSpec): string {
    return `FHive${spec.namespace}_${normalizeTypeName(spec.schema)}()`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return null;
  }

  public getCustomResponseHandler(spec: ITypeSpec): string {
    return '';
  }
}